import {
  collection,
  doc,
  getDocs,
  writeBatch,
  setDoc,
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { StoragePort } from '../../domain/ports/StoragePort';

const BATCH_LIMIT = 499;

/**
 * Splits an array of Firestore write operations into batches of at most BATCH_LIMIT ops.
 * Each element in `operations` is a function that receives a WriteBatch and adds ops to it.
 */
async function runBatchedWrites(operations) {
  for (let i = 0; i < operations.length; i += BATCH_LIMIT) {
    const chunk = operations.slice(i, i + BATCH_LIMIT);
    const batch = writeBatch(db);
    chunk.forEach((op) => op(batch));
    await batch.commit();
  }
}

export class FirestoreAdapter extends StoragePort {
  constructor(uid) {
    super();
    this.uid = uid;
  }

  #userRef() {
    return doc(db, 'users-family', this.uid);
  }

  #subCol(name) {
    return collection(db, 'users-family', this.uid, name);
  }

  async getUserData() {
    const [nodesSnap, edgesSnap, linkTypesSnap, groupsSnap] = await Promise.all([
      getDocs(this.#subCol('nodes')),
      getDocs(this.#subCol('edges')),
      getDocs(this.#subCol('customLinkTypes')),
      getDocs(this.#subCol('familyGroups')),
    ]);

    return {
      password: '',
      treeData: {
        nodes: nodesSnap.docs.map((d) => d.data()),
        edges: edgesSnap.docs.map((d) => d.data()),
        customLinkTypes: linkTypesSnap.docs.map((d) => d.data()),
        familyGroups: groupsSnap.docs.map((d) => d.data()),
      },
    };
  }

  async saveUserData(_uid, _password, nodes, edges, customLinkTypes = [], familyGroups = []) {
    await this.#writeAll(nodes, edges, customLinkTypes, familyGroups);
  }

  async importUserData(_uid, _password, nodes, edges, customLinkTypes = [], familyGroups = []) {
    await this.#writeAll(nodes, edges, customLinkTypes, familyGroups);
  }

  // StoragePort sync methods – not applicable for Firestore
  hasUsers() { return true; }
  getUsers() { return {}; }

  // ── Private helpers ─────────────────────────────────────────────────────────

  async #writeAll(nodes, edges, customLinkTypes, familyGroups) {
    // Ensure the user document exists (upsert)
    await setDoc(this.#userRef(), { uid: this.uid }, { merge: true });

    const [existingNodes, existingEdges, existingLinkTypes, existingGroups] = await Promise.all([
      getDocs(this.#subCol('nodes')),
      getDocs(this.#subCol('edges')),
      getDocs(this.#subCol('customLinkTypes')),
      getDocs(this.#subCol('familyGroups')),
    ]);

    const ops = [];

    // Delete docs that are no longer present
    const deleteStale = (snap, newItems) => {
      const newIds = new Set(newItems.map((item) => item.id));
      snap.docs.forEach((d) => {
        if (!newIds.has(d.id)) {
          ops.push((batch) => batch.delete(d.ref));
        }
      });
    };

    deleteStale(existingNodes, nodes);
    deleteStale(existingEdges, edges);
    deleteStale(existingLinkTypes, customLinkTypes);
    deleteStale(existingGroups, familyGroups);

    // Upsert current items
    const upsert = (subName, items) => {
      items.forEach((item) => {
        const ref = doc(db, 'users-family', this.uid, subName, item.id);
        ops.push((batch) => batch.set(ref, item));
      });
    };

    upsert('nodes', nodes);
    upsert('edges', edges);
    upsert('customLinkTypes', customLinkTypes);
    upsert('familyGroups', familyGroups);

    if (ops.length > 0) {
      await runBatchedWrites(ops);
    }
  }
}
