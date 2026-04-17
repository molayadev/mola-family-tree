import { isPartnerEdgeType, isBrokenLabel, resolveEdgeLabel } from '../../domain/config/constants';

const GENDER_COLORS = {
  male: { bg: '#DBEAFE', icon: '#2563EB' },
  female: { bg: '#FCE7F3', icon: '#DB2777' },
  unknown: { bg: '#F3F4F6', icon: '#6B7280' },
};

function buildEdgePath(edge, fromNode, toNode) {
  if (!fromNode || !toNode) {
    console.warn(`SnapshotService: missing node for edge ${edge.id} (from: ${edge.from}, to: ${edge.to})`);
    return '';
  }
  const isPartner = isPartnerEdgeType(edge.type);
  if (isPartner) {
    return `M ${fromNode.x} ${fromNode.y} L ${toNode.x} ${toNode.y}`;
  }
  return `M ${fromNode.x} ${fromNode.y} C ${fromNode.x} ${fromNode.y + 75}, ${toNode.x} ${toNode.y - 75}, ${toNode.x} ${toNode.y}`;
}

function getEdgeStyle(edge) {
  const isPartner = isPartnerEdgeType(edge.type);
  const label = resolveEdgeLabel(edge);
  const isBroken = isBrokenLabel(label);
  return {
    color: isPartner ? (isBroken ? '#9CA3AF' : '#F9A8D4') : '#CBD5E1',
    dash: isPartner ? (isBroken ? '5,5' : '0') : '0',
    isPartner,
  };
}

/**
 * Build a self-contained SVG string of the complete family tree.
 */
function buildTreeSvg(nodes, edges, padding = 80) {
  if (!nodes || nodes.length === 0) return null;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  nodes.forEach(n => {
    minX = Math.min(minX, n.x - 40);
    minY = Math.min(minY, n.y - 40);
    maxX = Math.max(maxX, n.x + 40);
    maxY = Math.max(maxY, n.y + 70);
  });

  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;

  const width = maxX - minX;
  const height = maxY - minY;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${minX} ${minY} ${width} ${height}" style="background:#F3F0EB">`;

  // Edges
  edges.forEach(edge => {
    const from = nodes.find(n => n.id === edge.from);
    const to = nodes.find(n => n.id === edge.to);
    const d = buildEdgePath(edge, from, to);
    if (!d) return;
    const s = getEdgeStyle(edge);
    svg += `<path d="${d}" stroke="white" stroke-width="6" fill="none" opacity="0.8"/>`;
    svg += `<path d="${d}" stroke="${s.color}" stroke-width="2" fill="none" stroke-dasharray="${s.dash}"/>`;
    if (s.isPartner && from && to) {
      svg += `<circle cx="${(from.x + to.x) / 2}" cy="${(from.y + to.y) / 2}" r="4" fill="${s.color}"/>`;
    }
  });

  // Nodes
  nodes.forEach(node => {
    const colors = GENDER_COLORS[node.data.gender] || GENDER_COLORS.unknown;
    svg += `<g transform="translate(${node.x}, ${node.y})">`;
    // Shadow
    svg += `<circle r="32" fill="black" opacity="0.1" cy="4"/>`;
    // Main circle
    svg += `<circle r="30" fill="${colors.bg}" stroke="white" stroke-width="3"/>`;
    // User icon (simplified person icon)
    svg += `<g transform="translate(0, 0)" fill="none" stroke="${colors.icon}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">`;
    svg += `<path d="M-4,-8 a4,4 0 1,0 8,0 a4,4 0 1,0 -8,0"/>`;
    svg += `<path d="M-8,8 C-8,2 -4,-1 0,-1 C4,-1 8,2 8,8"/>`;
    svg += `</g>`;
    // Name
    svg += `<text y="48" text-anchor="middle" font-size="10" font-weight="bold" fill="#374151" font-family="sans-serif" text-transform="uppercase" letter-spacing="0.05em">${escapeXml(node.data.firstName || '')}</text>`;
    // Dates
    const dateText = node.data.deathYear
      ? `${node.data.birthYear || '?'} - ${node.data.deathYear}`
      : (node.data.birthYear || '');
    if (dateText) {
      svg += `<text y="60" text-anchor="middle" font-size="9" fill="#6B7280" font-family="sans-serif">${escapeXml(dateText)}</text>`;
    }
    svg += `</g>`;
  });

  svg += `</svg>`;
  return { svg, width, height };
}

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Render the tree to a canvas and return a data URL (PNG).
 */
function renderToCanvas(svgString, width, height, scale = 2) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');

    const img = new Image();
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

/**
 * Download the tree as a PNG image.
 */
export async function downloadTreeSnapshot(username, nodes, edges) {
  const result = buildTreeSvg(nodes, edges);
  if (!result) return;

  const canvas = await renderToCanvas(result.svg, result.width, result.height, 2);
  const dataUrl = canvas.toDataURL('image/png');

  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `${username}_arbol.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * Print the tree – renders a clean image and opens the print dialog.
 * The tree is centered on the largest page possible (A1 landscape).
 */
export async function printTreeSnapshot(nodes, edges) {
  const result = buildTreeSvg(nodes, edges);
  if (!result) return;

  const canvas = await renderToCanvas(result.svg, result.width, result.height, 2);
  const dataUrl = canvas.toDataURL('image/png');

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('No se pudo abrir la ventana de impresión. Por favor, permite las ventanas emergentes para este sitio.');
    return;
  }

  printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
<title>Árbol Genealógico</title>
<style>
  @page { size: A1 landscape; margin: 10mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { display: flex; align-items: center; justify-content: center; width: 100vw; height: 100vh; background: #F3F0EB; }
  img { max-width: 100%; max-height: 100%; object-fit: contain; }
  @media print {
    body { background: white; }
    img { max-width: 100%; max-height: 100%; }
  }
</style>
</head>
<body>
<img src="${dataUrl}" />
<script>
  window.onload = function() { setTimeout(function() { window.print(); }, 300); };
</script>
</body>
</html>`);
  printWindow.document.close();
}
