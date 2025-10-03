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

#### `k8s/mongo-deployment.yaml`

Se definen **tres recursos**:

1. **PersistentVolumeClaim (PVC)** – Almacenamiento persistente
   Reserva **1 GiB** para que los datos de MongoDB no se pierdan si el pod se reinicia.

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

2. **Deployment** – Contenedor de MongoDB

   - Imagen oficial `mongo:6.0`.
   - Variables de entorno `MONGO_INITDB_ROOT_USERNAME` y `MONGO_INITDB_ROOT_PASSWORD` crean el usuario **admin** con contraseña **adminpass**.
   - Monta el volumen persistente en `/data/db`.

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

3. **Service** – Comunicación interna
   Expone MongoDB solo **dentro del clúster** para que el backend lo resuelva por DNS con el nombre `mongo` en el puerto **27017**.

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

### `k8s/backend-deployment.yaml`

El backend se conecta a MongoDB para leer y escribir datos.
Aquí se aprovecha el _Service_ `mongo` definido antes.

Se definen **dos recursos**:

1. **Deployment** – Contenedor del backend

   - Imagen `shinjimc/my-backend:latest`.
   - Variable `MONGO_URI` apunta al hostname **mongo** del Service de la base de datos
   - Expone el puerto interno **4000**.

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

2. **Service** – Exposición externa

   - Tipo `NodePort` para que clientes fuera del clúster (incluido el frontend) puedan acceder.
   - Disponible en `<IP_del_nodo>:32000`.

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

### `k8s/frontend-deployment.yaml`

El frontend es un sitio estático servido por Nginx que consume la API del backend (`http://<IP_del_nodo>:32000/items`).

Se definen **dos recursos**:

1. **Deployment** – Contenedor del frontend

   - Imagen `my-frontend:latest`.
   - Sirve los archivos en el puerto **80**.

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

2. **Service** – Exposición externa

   - Tipo `NodePort` para que los usuarios accedan desde su navegador.
   - Disponible en `<IP_del_nodo>:30080`.

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

sudo dnf install VirtualBox

sudo swapoff -a
sudo nano /etc/fstab
![Comentar swapoff](image.png)
cat /proc/swaps

sudo apt update && sudo apt upgrade -y
sudo apt install -y containerd

# 4️⃣ Generar configuración por defecto de containerd

sudo mkdir -p /etc/containerd
sudo containerd config default | sudo tee /etc/containerd/config.toml

# 5️⃣ Activar systemd cgroups en containerd

sudo sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml

# 6️⃣ Reiniciar y habilitar containerd

sudo systemctl restart containerd
sudo systemctl enable containerd
sudo systemctl status containerd

# 7️⃣ Verificar versión de containerd

containerd --version

# Agregar repo

sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.30/deb/Release.key | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-archive-keyring.gpg

echo "deb [signed-by=/etc/apt/keyrings/kubernetes-archive-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.30/deb/ /" | sudo tee /etc/apt/sources.list.d/kubernetes.list

# Instalar paquetes

sudo apt update
sudo apt install -y kubelet kubeadm kubectl
sudo apt-mark hold kubelet kubeadm kubectl

# Verificar versiones

kubeadm version
kubectl version --client
kubelet --version

![verificacion](image-1.png)

# Habilitar los módulos y parámetros de kernel requeridos:

sudo modprobe overlay
sudo modprobe br_netfilter

# Persistir configuración

sudo tee /etc/sysctl.d/kubernetes.conf<<EOF
net.bridge.bridge-nf-call-iptables = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward = 1
EOF

sudo sysctl --system

# ACA CON MASTER
sudo kubeadm init \
  --apiserver-advertise-address=192.168.56.102 \
  --pod-network-cidr=10.244.0.0/16

![init](image-2.png)
guardamos el join para los workers:
![join que genera](image-3.png)

# Configurar kubectl en el master

mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
kubectl get nodes

![nodos not ready master](image-4.png)

# Instalar un CNI (Flannel)

El CNI (Flannel) se instala en el master y automáticamente configura la red para todo el cluster, de manera que los workers también puedan comunicarse correctamente.

kubectl apply -f https://raw.githubusercontent.com/cloudnativelabs/kube-router/master/daemonset/kubeadm-kuberouter.yaml
kubectl get nodes
kubectl get pods -n kube-flannel
kubectl get nodes

![flannel](image-5.png)

# Unir workers

Ejecutamos el join que recibimos del kubeadm
![Union de worker1](image-6.png)

sudo kubeadm join 192.168.56.102:6443 --token i6h2ml.wuoeun76az7kl1r2 \
        --discovery-token-ca-cert-hash sha256:0cddb932c7389f807681a3b3cb4a33edb7d3b29cd1bde0eb08778a95211f20c3 

![nodes ya conectados](image-7.png)


# pa prdener los nodos

Esto creará pods kube-flannel en todos los nodos.

kubectl get pods -n kube-system
kubectl get nodes

![ready todos](image-8.png)


# probar un nginx

kubectl create deployment nginx-test --image=nginx
kubectl expose deployment nginx-test --type=NodePort --port=80
kubectl get services

sudo ufw allow 30576/tcp
sudo ufw reload


# Cargar proyecto

git clone al repo

luego en master entrar a la carpeta k8s y 


Entra a uno de los pods de MongoDB (por ejemplo mongo-0):

kubectl exec -it mongo-0 -- mongosh -u admin -p adminpass


Dentro del shell de Mongo, ejecuta:

rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongo-0.mongo:27017" },
    { _id: 1, host: "mongo-1.mongo:27017" },
    { _id: 2, host: "mongo-2.mongo:27017" }
  ]
})


Verifica el estado del ReplicaSet:

rs.status()