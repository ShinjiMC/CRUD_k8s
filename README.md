# CRUD de Productos

Este proyecto es un **CRUD de productos** que permite registrar productos con **nombre** y **precio**.
Se compone de:

- **Frontend:** React.js
- **Backend:** Node.js (Express)
- **Base de datos:** MongoDB

---

## Ejecución

Si quieres probar el software localmente antes de desplegarlo en Kubernetes:

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Esto iniciará el frontend en modo desarrollo. Recuerda ajustar la URL del backend en `App.js` según donde esté corriendo tu API (por ejemplo `http://localhost:4000/items`).

### Backend

```bash
cd backend
npm install
npm run start
```

Esto iniciará el backend en el puerto 4000 por defecto y conectará con MongoDB según la variable de entorno `MONGO_URI`.

---

## Despliegue mediante Kubernetes

### 1. Construcción de imágenes Docker

Antes de desplegar en Kubernetes, construye las imágenes Docker para **backend** y **frontend**.

#### Backend

El backend cuenta con un `Dockerfile` que genera una imagen ligera de Node.js que levanta un servidor en el puerto 4000, lista para producción.

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 4000
CMD ["node", "server.js"]
```

| Línea                              | Función                                                                                                                                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`FROM node:20-alpine`**          | Usa como **imagen base** la versión de Node.js 20 sobre Alpine Linux (imagen mínima y ligera) para reducir el tamaño final del contenedor.                                                 |
| **`WORKDIR /app`**                 | Establece `/app` como **directorio de trabajo** dentro del contenedor. Cualquier comando siguiente se ejecutará desde aquí.                                                                |
| **`COPY package*.json ./`**        | Copia `package.json` y `package-lock.json` (si existe) al contenedor. Se copian primero para aprovechar la **caché de Docker** y no reinstalar dependencias cada vez que cambie el código. |
| **`RUN npm install --production`** | Instala únicamente las **dependencias necesarias en producción** (excluye `devDependencies`) para reducir el tamaño de la imagen.                                                          |
| **`COPY . .`**                     | Copia **todo el código fuente** del backend dentro del contenedor (al directorio `/app`).                                                                                                  |
| **`EXPOSE 4000`**                  | Indica que el contenedor escuchará en el **puerto 4000** (informativo; el puerto real se publica en `docker run -p`).                                                                      |
| **`CMD ["node", "server.js"]`**    | Comando por defecto para iniciar la aplicación: ejecuta `node server.js`.                                                                                                                  |

- Comando para construir la imagen del backend:

```bash
docker build -t my-backend ./backend
```

![](.docs/dock_backend.png)

#### Frontend

El frontend utiliza un `Dockerfile` que crea una imagen mínima para servir el **sitio web estático** (ya compilado) en el puerto **80** usando Nginx.

```dockerfile
FROM nginx:alpine
COPY dist/ /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

| Línea                                    | Función                                                                                                                                                                                                      |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`FROM nginx:alpine`**                  | Usa como **imagen base** Nginx en versión Alpine (muy ligera). Nginx es ideal para servir archivos estáticos.                                                                                                |
| **`COPY dist/ /usr/share/nginx/html`**   | Copia el contenido de la carpeta `dist/` (resultado del build del frontend, por ejemplo `npm run build`) dentro de la carpeta que Nginx usa por defecto para servir archivos HTML (`/usr/share/nginx/html`). |
| **`EXPOSE 80`**                          | Expone el **puerto 80**, que es el puerto HTTP estándar.                                                                                                                                                     |
| **`CMD ["nginx", "-g", "daemon off;"]`** | Inicia Nginx en primer plano (`daemon off`) para que el contenedor siga en ejecución.                                                                                                                        |

- Comando para construir la imagen del frontend:

```bash
docker build -t my-frontend ./frontend
```

![](.docs/dock_front.png)

---

- Verifica que las imágenes se hayan creado correctamente:

```bash
docker images
```

![](.docs/docker_img.png)

- Si vas a usar un cluster remoto con **kubeadm** o cualquier otro cluster que no tenga acceso a tus imágenes locales, etiqueta y sube la imagen del backend a Docker Hub:

```bash
docker tag my-backend:latest <user>/my-backend:latest
docker push <user>/my-backend:latest
docker tag my-backend:latest <user>/my-frontend:latest
docker push <user>/my-frontend:latest
```

![](.docs/push.png)

### 2. Despliegue en Kubernetes

Todos los archivos de configuración YAML se encuentran en la carpeta `k8s/`. Y estos son los archivos:

#### `k8s/backend-deployment.yaml`

Se definen **dos recursos**:

1. **Deployment**: despliega el contenedor del backend.

- **replicas: 1**: lanza una sola réplica del backend.
- **image**: usa la imagen Docker publicada en `shinjimc/my-backend:latest`.
- **env**: define la variable `MONGO_URI` para conectarse a MongoDB.
- **containerPort 4000**: el contenedor escucha en el puerto 4000.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  replicas: 1
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
        - name: backend
          image: shinjimc/my-backend:latest
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 4000
          env:
            - name: MONGO_URI
              value: mongodb://admin:adminpass@mongo:27017/test?authSource=admin
```

2. **Service**: expone el backend hacia el exterior.

- **type: NodePort**: permite el acceso desde fuera del clúster.
- **nodePort 32000**: el backend será accesible desde `<IP_del_nodo>:32000`.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: backend
spec:
  type: NodePort
  selector:
    app: backend
  ports:
    - protocol: TCP
      port: 4000
      targetPort: 4000
      nodePort: 32000
```

---

#### `k8s/frontend-deployment.yaml`

Se definen **dos recursos**:

1. **Deployment**: despliega el contenedor del frontend.

- Despliega una réplica del contenedor Nginx que sirve en el puerto 80.
- Usa la imagen `my-frontend:latest` generada previamente.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
spec:
  replicas: 1
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
        - name: frontend
          image: my-frontend:latest
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 80
```

2. **Service**: expone el frontend hacia el exterior.

- **type: NodePort**: expone el frontend fuera del clúster.
- **nodePort 30080**: el sitio web será accesible desde `<IP_del_nodo>:30080`.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: frontend
spec:
  type: NodePort
  selector:
    app: frontend
  ports:
    - protocol: TCP
      port: 80
      targetPort: 80
      nodePort: 30080
```

---

#### `k8s/mongo-deployment.yaml`

Se definen **tres recursos**:

1. **PersistentVolumeClaim (PVC)**: para almacenar los datos de MongoDB de manera persistente.

- Reserva 1 GiB de almacenamiento persistente para la base de datos.

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mongo-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
```

2. **Deployment**: despliega el contenedor de MongoDB.

- Despliega MongoDB versión 6.0 con credenciales de administrador (`admin` / `adminpass`).
- **volumeMounts**: monta el volumen persistente en `/data/db` para conservar los datos.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mongo
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mongo
  template:
    metadata:
      labels:
        app: mongo
    spec:
      containers:
        - name: mongo
          image: mongo:6.0
          ports:
            - containerPort: 27017
          env:
            - name: MONGO_INITDB_ROOT_USERNAME
              value: admin
            - name: MONGO_INITDB_ROOT_PASSWORD
              value: adminpass
          volumeMounts:
            - name: mongo-storage
              mountPath: /data/db
      volumes:
        - name: mongo-storage
          persistentVolumeClaim:
            claimName: mongo-pvc
```

3. **Service**: permite la comunicación interna dentro del clúster.

- Expone MongoDB **solo dentro del clúster**, para que el backend pueda conectarse.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mongo
spec:
  selector:
    app: mongo
  ports:
    - protocol: TCP
      port: 27017
      targetPort: 27017
```

---

#### a) Aplicar los deployments y servicios

```bash
kubectl apply -f k8s/mongo-deployment.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
```

![](.docs/kuber_run.png)

#### b) Verificar el estado de los pods y servicios

```bash
kubectl get pods
kubectl get svc
```

![](.docs/valid.png)

### 3. Acceso a la aplicación

La página web estará disponible a través del servicio de Kubernetes en el puerto 30080.
Podrás interactuar con el CRUD de productos desde tu navegador:

![](.docs/web.png)

---

## Author

- **ShinjiMC** - [GitHub Profile](https://github.com/ShinjiMC)

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
