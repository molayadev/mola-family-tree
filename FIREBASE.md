# 🔥 Firebase – Guía de configuración

Esta guía explica cómo configurar Firebase para FamilyCanvas, tanto para desarrollo local como para el despliegue continuo con GitHub Actions.

---

## Índice

1. [Requisitos previos](#1-requisitos-previos)
2. [Crear el proyecto Firebase](#2-crear-el-proyecto-firebase)
3. [Habilitar Authentication (Google)](#3-habilitar-authentication-google)
4. [Configurar Firestore](#4-configurar-firestore)
5. [Obtener las credenciales de la app web](#5-obtener-las-credenciales-de-la-app-web)
6. [Variables de entorno en local](#6-variables-de-entorno-en-local)
7. [Despliegue: GitHub Actions + Secrets](#7-despliegue-github-actions--secrets)
8. [Estructura de la base de datos Firestore](#8-estructura-de-la-base-de-datos-firestore)
9. [Reglas de seguridad Firestore](#9-reglas-de-seguridad-firestore)
10. [Desplegar las reglas manualmente](#10-desplegar-las-reglas-manualmente)

---

## 1. Requisitos previos

- Cuenta de Google
- Node.js 20+ instalado
- `firebase-tools` instalado globalmente (solo para despliegues manuales):
  ```bash
  npm install -g firebase-tools
  ```

---

## 2. Crear el proyecto Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/) y haz clic en **"Agregar proyecto"**.
2. Elige un nombre (p. ej. `mola-family-tree`).
3. Puedes desactivar Google Analytics si no lo necesitas.
4. Clic en **"Crear proyecto"**.

---

## 3. Habilitar Authentication (Google)

1. En la consola Firebase, ve a **Build → Authentication**.
2. Clic en **"Comenzar"**.
3. En la pestaña **"Sign-in method"**, activa **Google**.
4. Elige un correo de soporte del proyecto y guarda.

> ⚠️ El dominio de tu app (Firebase Hosting, localhost, etc.) debe estar en la lista de dominios autorizados:
> **Authentication → Settings → Authorized domains**. Firebase añade `localhost` y el dominio de Hosting automáticamente.

---

## 4. Configurar Firestore

1. Ve a **Build → Firestore Database**.
2. Clic en **"Crear base de datos"**.
3. Elige **"Modo de producción"** (las reglas del repositorio ya cubren la seguridad).
4. Selecciona la región más cercana a tus usuarios (p. ej. `europe-west1`).
5. Clic en **"Crear"**.

---

## 5. Obtener las credenciales de la app web

1. En **Configuración del proyecto** (rueda dentada ⚙️ → **Configuración del proyecto**).
2. Desplázate hasta **"Tus aplicaciones"** y haz clic en **`</>`** (Web).
3. Registra la app con un apodo (p. ej. `FamilyCanvas Web`). Activa **Firebase Hosting** si quieres usarlo.
4. Firebase te mostrará el objeto `firebaseConfig`. Copia los valores:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "mola-family-tree.firebaseapp.com",
  projectId: "mola-family-tree",
  storageBucket: "mola-family-tree.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

---

## 6. Variables de entorno en local

Copia el archivo de ejemplo y rellena tus valores:

```bash
cp .env.example .env.local
```

Edita `.env.local`:

```dotenv
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=mola-family-tree.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=mola-family-tree
VITE_FIREBASE_STORAGE_BUCKET=mola-family-tree.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

> `.env.local` está en `.gitignore` y **nunca** debe subirse al repositorio.

Arranca en local y verifica que el botón "Continuar con Google" funciona:

```bash
npm run dev
```

---

## 7. Despliegue: GitHub Actions + Secrets

Los workflows de CI/CD (`deploy.yml` y `deploy-pr-preview.yml`) necesitan dos tipos de secretos en GitHub:

### 7.1 Service Account (ya existente)

El secreto `FIREBASE_SERVICE_ACCOUNT` ya está configurado en el repositorio. Es el JSON de la cuenta de servicio que descargaste de Firebase y que `FirebaseExtended/action-hosting-deploy` usa para autenticarse.

Si necesitas regenerarlo:

1. Firebase Console → **Configuración del proyecto → Cuentas de servicio**.
2. Clic en **"Generar nueva clave privada"** → descarga el `.json`.
3. En GitHub → **Settings → Secrets and variables → Actions → New repository secret**:
   - Nombre: `FIREBASE_SERVICE_ACCOUNT`
   - Valor: pega el contenido completo del `.json`.

### 7.2 Variables de entorno de la app Vite

Las variables `VITE_FIREBASE_*` deben estar disponibles durante el paso `npm run build` en el runner de GitHub Actions. Hay dos formas de pasarlas:

#### Opción A — GitHub Secrets individuales + paso `env` (recomendada)

1. Añade cada variable como **Repository Secret** en GitHub:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`

2. Referéncialas en el paso de build del workflow:

```yaml
      - name: Build
        run: npm run build
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
          VITE_FIREBASE_STORAGE_BUCKET: ${{ secrets.VITE_FIREBASE_STORAGE_BUCKET }}
          VITE_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.VITE_FIREBASE_MESSAGING_SENDER_ID }}
          VITE_FIREBASE_APP_ID: ${{ secrets.VITE_FIREBASE_APP_ID }}
```

#### Opción B — Extraer variables del JSON del Service Account

Si prefieres no añadir secretos extra y los valores están en el JSON del service account (normalmente no es el caso para el `apiKey` del SDK web), puedes usar un paso intermedio con `jq`:

```yaml
      - name: Extract Firebase web config from service account
        run: |
          echo "VITE_FIREBASE_PROJECT_ID=$(echo '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}' | jq -r '.project_id')" >> $GITHUB_ENV
          # Añade el resto de vars que puedas extraer del JSON
```

> ⚠️ El `apiKey` del SDK web **no** está en el service account JSON — es una credencial pública diferente. Necesitarás los secretos individuales para las vars `VITE_FIREBASE_*`.

### 7.3 Workflows actuales

Los workflows ya contienen el paso de despliegue a Firebase Hosting. Solo necesitas añadir el bloque `env` al paso de build:

**`.github/workflows/deploy.yml`** (producción, rama `main`):

```yaml
      - name: Build
        run: npm run build
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
          VITE_FIREBASE_STORAGE_BUCKET: ${{ secrets.VITE_FIREBASE_STORAGE_BUCKET }}
          VITE_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.VITE_FIREBASE_MESSAGING_SENDER_ID }}
          VITE_FIREBASE_APP_ID: ${{ secrets.VITE_FIREBASE_APP_ID }}
```

**`.github/workflows/deploy-pr-preview.yml`** (preview por PR, 2 días de vida):

Mismo bloque `env` en el paso de build.

---

## 8. Estructura de la base de datos Firestore

Cada usuario tiene sus propias subcollections bajo `/users-family/{uid}/`. No se necesitan índices compuestos:

```
/users-family/{uid}/
    uid: string

/users-family/{uid}/nodes/{nodeId}
    id: string
    x: number
    y: number
    data: { firstName, lastName, gender, birthDate, birthTime,
            deathDate, ascendantSign, sunSign, moonSign,
            twinType, birthOrder, birthLatitude, birthLongitude,
            additionalInfo }

/users-family/{uid}/edges/{edgeId}
    id: string
    from: string
    to: string
    type: string
    label: string
    customLinkId: string
    styleMode: string
    styleColor: string

/users-family/{uid}/customLinkTypes/{linkTypeId}
    id: string
    name: string
    visualType: string
    color: string

/users-family/{uid}/familyGroups/{groupId}
    id: string
    label: string
    emoji: string
    color: string
    nodeIds: string[]
    collapsed: boolean
```

Las escrituras usan `writeBatch` dividido en bloques de ≤ 499 operaciones para respetar el límite de Firestore.

---

## 9. Reglas de seguridad Firestore

El archivo `firestore.rules` en la raíz del repositorio garantiza que cada usuario solo puede leer y escribir su propio árbol:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users-family/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

---

## 10. Desplegar las reglas manualmente

Si haces cambios en `firestore.rules` y quieres desplegarlas sin esperar al CI:

```bash
firebase login
firebase deploy --only firestore:rules
```

Para desplegar también Hosting:

```bash
npm run build
firebase deploy
```
