# Aplicación gestionada por K8s: Sistema de Gestión de Inventario Escalable

El presente proyecto consiste en el desarrollo de una aplicación orientada a la gestión integral del inventario de productos de una empresa. La aplicación permite realizar operaciones de registro, actualización, consulta y eliminación de productos, garantizando la consistencia y disponibilidad de los datos en entornos concurrentes. Está diseñada para soportar múltiples usuarios de manera simultánea y aprovechar las capacidades de escalabilidad y alta disponibilidad que ofrece Kubernetes (K8s), asegurando un funcionamiento continuo y eficiente incluso ante picos de carga o fallos en alguno de los servicios.

## **Descripción de microservicios**

La arquitectura de la aplicación se organiza bajo un esquema de **microservicios**, con la finalidad de mantener cada componente modular, independiente y escalable. Los principales microservicios implementados son:

- **Frontend:** Desarrollado con **React JS**, este microservicio se encarga de la interfaz de usuario y de la comunicación con los servicios de backend. Facilita la interacción de los usuarios con el sistema y presenta la información de manera clara y dinámica.

- **Data-service:** Implementado en **Node.js**, se encarga de la búsqueda, filtrado y recuperación eficiente de los productos almacenados en la base de datos. Su independencia permite escalar este servicio de manera autónoma según la demanda de consultas.

- **Backend-service:** También desarrollado en **Node.js**, este microservicio gestiona la adición, modificación y eliminación de productos, asegurando la integridad de las transacciones y operaciones de inventario.

La separación en microservicios permite que cada componente pueda ser replicado, actualizado o escalado de manera independiente, facilitando la **resiliencia y disponibilidad del sistema** en entornos productivos.

## **Justificación de herramientas utilizadas**

1. **Kubernetes (K8s):**
   Se utiliza como orquestador de contenedores para automatizar despliegues, gestionar la escalabilidad de los microservicios y garantizar la alta disponibilidad del sistema. En este proyecto, Kubernetes se implementa sobre máquinas virtuales simulando un clúster de tres nodos, permitiendo balanceo de carga, tolerancia a fallos y administración centralizada de los servicios.

2. **Docker:**
   Permite empaquetar cada microservicio en contenedores independientes, asegurando consistencia y portabilidad en cualquier entorno de ejecución. Además, el uso de **imágenes en Docker Hub** facilita la distribución y el despliegue ágil de los servicios en múltiples nodos del clúster.

3. **MongoDB:**
   Se selecciona como sistema de base de datos NoSQL por su flexibilidad, confiabilidad y soporte para transacciones complejas. Su despliegue mediante **StatefulSets** dentro de Kubernetes permite mantener la disponibilidad y persistencia de los datos, incluso durante actualizaciones o escalamiento del clúster.

4. **Herramientas complementarias (kubeadm y kuberouter):**
   Se emplean para la inicialización del clúster y la gestión eficiente de la red interna entre los pods y servicios, garantizando comunicación segura y estable entre los microservicios.

## **Otros datos relevantes**

Se contempla la integración futura de **Elasticsearch** para optimizar la búsqueda de productos y facilitar análisis avanzados de inventario, enlazando esta funcionalidad con la base de datos MongoDB. Asimismo, se planea implementar un sistema de **identificación de usuarios y roles**, de manera que se pueda controlar el acceso y definir permisos específicos sobre las acciones que cada usuario puede realizar, incluyendo la generación de boletas y la gestión de ventas como un sistema de punto de venta integrado.

Esta arquitectura permitirá escalar los microservicios según la demanda, habilitando **monitoreo en tiempo real del flujo de ventas**, análisis estadístico de productos más vendidos y generación de reportes por intervalos de tiempo (diario, semanal, mensual o anual), contribuyendo a una toma de decisiones más informada y eficiente.

![](.docs/pipeline_d.png)

En términos de seguridad, la comunicación interna entre los microservicios del clúster se realiza a través de puertos privados y redes internas gestionadas por Kube-Router, lo que impide el acceso directo desde el exterior. El usuario final interactúa únicamente a través de una URL pública, mientras que todos los puntos de acceso internos y la comunicación entre pods permanecen aislados y protegidos, reduciendo significativamente la superficie de ataque y mejorando la confiabilidad del sistema.

Adicionalmente, esta arquitectura permitirá escalar los microservicios según la demanda, habilitando monitoreo en tiempo real del flujo de ventas, análisis estadístico de productos más vendidos y generación de reportes por intervalos de tiempo (diario, semanal, mensual o anual), contribuyendo a una toma de decisiones más informada y eficiente.

## **Conclusión**

La propuesta presentada combina la arquitectura de microservicios con la orquestación de contenedores mediante Kubernetes para ofrecer un sistema de gestión de inventario **robusto, escalable y altamente disponible**. La modularidad de los servicios, junto con la selección estratégica de herramientas como Docker y MongoDB, permite que la aplicación se adapte a distintos niveles de demanda y facilite la administración eficiente de recursos. Adicionalmente, la planificación de futuras integraciones como Elasticsearch y sistemas de control de usuarios asegura que el sistema pueda evolucionar hacia un entorno más inteligente y analítico, alineado con las necesidades de negocios modernos.

---

## Implementación de Kubernetes con el sistema actual

La implementación de Kubernetes (K8s) sobre el sistema actual se realizó con el objetivo de **orquestar contenedores y garantizar la escalabilidad y alta disponibilidad** de los microservicios. A continuación, se detallan los pasos seguidos, acompañados de descripciones e imágenes ilustrativas para mayor claridad.

### **1. Preparación del entorno**

Se instalaron las herramientas necesarias y se desactivó el intercambio de memoria (swap), requisito indispensable para Kubernetes:

```bash
sudo dnf install VirtualBox
sudo swapoff -a
sudo nano /etc/fstab  # comentar las líneas de swap
cat /proc/swaps
```

![Comentar swapoff](.docs/image.png)

Se actualizó el sistema y se instaló **containerd**, el runtime de contenedores utilizado:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y containerd
```

### **2. Configuración de containerd**

Se generó la configuración por defecto y se activó el soporte para **systemd cgroups**, necesario para un correcto manejo de recursos:

```bash
sudo mkdir -p /etc/containerd
sudo containerd config default | sudo tee /etc/containerd/config.toml
sudo sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml
sudo systemctl restart containerd
sudo systemctl enable containerd
sudo systemctl status containerd
containerd --version
```

### **3. Instalación de Kubernetes**

Se configuró el repositorio oficial y se instalaron los paquetes principales: `kubelet`, `kubeadm` y `kubectl`.

```bash
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.30/deb/Release.key | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-archive-keyring.gpg

echo "deb [signed-by=/etc/apt/keyrings/kubernetes-archive-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.30/deb/ /" | sudo tee /etc/apt/sources.list.d/kubernetes.list

sudo apt update
sudo apt install -y kubelet kubeadm kubectl
sudo apt-mark hold kubelet kubeadm kubectl

kubeadm version
kubectl version --client
kubelet --version
```

![Verificación](.docs/image-1.png)

Se habilitaron los módulos y parámetros de kernel requeridos para el funcionamiento de Kubernetes:

```bash
sudo modprobe overlay
sudo modprobe br_netfilter

sudo tee /etc/sysctl.d/kubernetes.conf<<EOF
net.bridge.bridge-nf-call-iptables = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward = 1
EOF

sudo sysctl --system
```

### **4. Inicialización del master**

El nodo master se inicializó usando `kubeadm init`, especificando la dirección del API server y el rango de red de los pods:

```bash
sudo kubeadm init \
 --apiserver-advertise-address=192.168.56.102 \
 --pod-network-cidr=10.244.0.0/16
```

![Init](.docs/image-2.png)

Se guardó el comando `join` generado para unir los nodos worker posteriormente:

![Join generado](.docs/image-3.png)

Para poder usar `kubectl` en el master, se configuró el acceso:

```bash
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
kubectl get nodes
```

![Nodos not ready master](.docs/image-4.png)

### **5. Configuración de la red con CNI (Kube-Router)**

Para habilitar la comunicación entre todos los pods del clúster, se instaló Kube-Router como CNI. Esto reemplaza al uso de Flannel y permite manejar el networking y routing de manera eficiente dentro del clúster:

```bash
kubectl apply -f https://raw.githubusercontent.com/cloudnativelabs/kube-router/master/daemonset/kubeadm-kuberouter.yaml
kubectl get nodes
kubectl get pods -n kube-system -o wide
kubectl get nodes
```

![alt text](.docs/image-12.png)

### **6. Unión de nodos worker**

Los nodos worker se unieron al clúster ejecutando el comando `join` generado durante la inicialización del master:

```bash
sudo kubeadm join 192.168.56.102:6443 --token i6h2ml.wuoeun76az7kl1r2 \
 --discovery-token-ca-cert-hash sha256:0cddb932c7389f807681a3b3cb4a33edb7d3b29cd1bde0eb08778a95211f20c3
```

![Union de worker1](.docs/image-6.png)
![Nodos ya conectados](.docs/image-7.png)

Una vez conectados, se verificó que los pods de `kube-router` se desplegaran correctamente en todos los nodos:

```bash
kubectl get nodes -o wide
```

![alt text](.docs/image-13.png)

### **7. Despliegue de prueba con Nginx**

Para validar el funcionamiento del clúster, se creó un despliegue de Nginx y se expuso mediante un servicio NodePort:

```bash
kubectl create deployment nginx-test --image=nginx
kubectl expose deployment nginx-test --type=NodePort --port=80
kubectl get services

sudo ufw allow 30576/tcp
sudo ufw reload
```

### **8. Despliegue del proyecto**

Finalmente, se clonó el repositorio del proyecto y se aplicaron los manifiestos de Kubernetes para desplegar todos los microservicios:

```bash
git clone https://github.com/ShinjiMC/CRUD_k8s.git
git checkout vms
cd k8s
kubectl apply -f .
```

![Apply a todo](.docs/image-9.png)

La aplicación desplegada muestra:

- **Vista general del sistema:**

![Vista general](.docs/image-10.png)

- **Vista de búsqueda de productos (ejemplo: “bolsa”):**

![Buscar "bolsa"](.docs/image-11.png)

---

## Códigos YAML para k8s

### backend-deployment.yaml

- **1. Deployment: `backend`**

  ```yaml
  apiVersion: apps/v1
  kind: Deployment
  metadata:
    name: backend
  spec:
    replicas: 3
    selector:
      matchLabels:
        app: backend
    template:
      metadata:
        labels:
          app: backend
      spec:
        affinity:
          podAntiAffinity:
            requiredDuringSchedulingIgnoredDuringExecution:
              - labelSelector:
                  matchExpressions:
                    - key: app
                      operator: In
                      values:
                        - backend
                topologyKey: "kubernetes.io/hostname"
        containers:
          - name: backend
            image: shinjimc/backend:latest
            imagePullPolicy: Always
            ports:
              - containerPort: 4000
            env:
              - name: MONGO_URI
                value: mongodb://admin:adminpass@mongo-service:27017/test?authSource=admin
  ```

  - **`apiVersion: apps/v1` y `kind: Deployment`**: Define un **Deployment**, que es un objeto de Kubernetes encargado de **gestionar pods replicados, actualizaciones y escalabilidad**.

  - **`metadata.name: backend`**: Nombre del Deployment, usado para identificarlo dentro del clúster.

  - **`spec.replicas: 3`**: Indica que Kubernetes debe mantener **3 pods backend corriendo simultáneamente**, garantizando alta disponibilidad.

  - **`selector.matchLabels` y `template.metadata.labels`**: Etiquetas que identifican los pods gestionados por este Deployment. Permiten que Kubernetes sepa qué pods pertenecen al Deployment.

  - **`spec.affinity.podAntiAffinity`**: Configura que los pods del Deployment **no se programen en el mismo nodo físico**, aumentando la **tolerancia a fallos**.

    - `topologyKey: "kubernetes.io/hostname"` asegura que los pods se distribuyan entre nodos distintos.

  - **`containers`**:

    - **`name: backend`**: nombre del contenedor dentro del pod.
    - **`image: shinjimc/backend:latest`**: imagen Docker que se desplegará.
    - **`imagePullPolicy: Always`**: siempre descarga la última versión de la imagen.
    - **`ports.containerPort: 4000`**: puerto interno del contenedor.
    - **`env`**: variable de entorno `MONGO_URI`, usada para conectarse a MongoDB dentro del clúster (`mongo-service`).

---

- **2. Service: `backend`**

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

  - **`apiVersion: v1` y `kind: Service`**: Define un **Service**, que es la forma de **exponer los pods a la red interna o externa** en Kubernetes.

  - **`metadata.name: backend`**: Nombre del Service, usado para referenciarlo dentro del clúster.

  - **`spec.type: NodePort`**: Permite que la aplicación sea accesible desde fuera del clúster mediante un puerto del nodo físico.

  - **`selector: app: backend`**: Selecciona los pods etiquetados con `app: backend` para que este Service enrute el tráfico hacia ellos.

  - **`ports`**:

    - `port: 4000` → puerto que se expone dentro del clúster.
    - `targetPort: 4000` → puerto del contenedor al que se dirige el tráfico.
    - `nodePort: 32000` → puerto físico del nodo que permite acceder al servicio desde fuera del clúster.

---

### dataservice-deployment.yaml

- **1. Deployment: `data-service`**

  ```yaml
  apiVersion: apps/v1
  kind: Deployment
  metadata:
    name: data-service
  spec:
    replicas: 3
    selector:
      matchLabels:
        app: data-service
    template:
      metadata:
        labels:
          app: data-service
      spec:
        affinity:
          podAntiAffinity:
            requiredDuringSchedulingIgnoredDuringExecution:
              - labelSelector:
                  matchExpressions:
                    - key: app
                      operator: In
                      values:
                        - data-service
                topologyKey: "kubernetes.io/hostname"
        containers:
          - name: data-service
            image: shinjimc/data-service:latest
            imagePullPolicy: Always
            ports:
              - containerPort: 4001
            env:
              - name: MONGO_URI
                value: mongodb://admin:adminpass@mongo-service:27017/test?authSource=admin
  ```

  - **`apiVersion: apps/v1` y `kind: Deployment`**: Define un **Deployment**, que gestiona **pods replicados** para asegurar disponibilidad, escalabilidad y facilidad de actualización.

  - **`metadata.name: data-service`**: Nombre del Deployment dentro del clúster.

  - **`spec.replicas: 3`**: Mantiene **3 pods del data-service** activos, asegurando alta disponibilidad y tolerancia a fallos.

  - **`selector.matchLabels` y `template.metadata.labels`**: Etiquetas que permiten que Kubernetes identifique qué pods pertenecen a este Deployment.

  - **`spec.affinity.podAntiAffinity`**: Configura que los pods del data-service **no se ejecuten en el mismo nodo** si es posible, mejorando la resiliencia ante fallos de un nodo (`topologyKey: "kubernetes.io/hostname"`).

  - **`containers`**:

    - **`name: data-service`**: nombre del contenedor dentro del pod.
    - **`image: shinjimc/data-service:latest`**: imagen Docker que contiene el microservicio.
    - **`imagePullPolicy: Always`**: garantiza que siempre se obtenga la última versión de la imagen.
    - **`ports.containerPort: 4001`**: puerto interno que expone el contenedor.
    - **`env`**: variable `MONGO_URI` para conectarse a MongoDB (`mongo-service`) dentro del clúster.

- **2. Service: `data-service`**

  ```yaml
  apiVersion: v1
  kind: Service
  metadata:
    name: data-service
  spec:
    type: NodePort
    selector:
      app: data-service
    ports:
      - protocol: TCP
        port: 4001
        targetPort: 4001
        nodePort: 32001
  ```

  - **`apiVersion: v1` y `kind: Service`**: Define un **Service**, que expone los pods del data-service **a la red interna y externa**.

  - **`metadata.name: data-service`**: Nombre del Service usado para referenciarlo en el clúster.

  - **`spec.type: NodePort`**: Permite que el servicio sea accesible desde fuera del clúster a través del puerto del nodo físico.

  - **`selector: app: data-service`**: Selecciona los pods etiquetados como `data-service` para enrutarles el tráfico.

  - **`ports`**:

    - `port: 4001` → puerto expuesto dentro del clúster.
    - `targetPort: 4001` → puerto interno del contenedor que recibe las solicitudes.
    - `nodePort: 32001` → puerto del nodo que permite acceder al servicio desde fuera del clúster.

---

### frontend-deployment.yaml

- **1. Deployment: `frontend`**

  ```yaml
  apiVersion: apps/v1
  kind: Deployment
  metadata:
    name: frontend
  spec:
    replicas: 3
    selector:
      matchLabels:
        app: frontend
    template:
      metadata:
        labels:
          app: frontend
      spec:
        affinity:
          podAntiAffinity:
            requiredDuringSchedulingIgnoredDuringExecution:
              - labelSelector:
                  matchExpressions:
                    - key: app
                      operator: In
                      values:
                        - frontend
                topologyKey: "kubernetes.io/hostname"
        containers:
          - name: frontend
            image: shinjimc/frontend:latest
            imagePullPolicy: Always
            ports:
              - containerPort: 80
  ```

  - **`apiVersion: apps/v1` y `kind: Deployment`**: Define un **Deployment**, que gestiona **pods replicados** para asegurar disponibilidad, escalabilidad y facilidad de actualización.

  - **`metadata.name: frontend`**: Nombre del Deployment dentro del clúster.

  - **`spec.replicas: 3`**: Mantiene **3 pods del frontend** activos, asegurando alta disponibilidad y tolerancia a fallos.

  - **`selector.matchLabels` y `template.metadata.labels`**: Etiquetas que permiten que Kubernetes identifique qué pods pertenecen a este Deployment.

  - **`spec.affinity.podAntiAffinity`**: Configura que los pods del frontend **no se ejecuten en el mismo nodo** si es posible, mejorando la resiliencia ante fallos de un nodo (`topologyKey: "kubernetes.io/hostname"`).

  - **`containers`**:

    - **`name: frontend`**: nombre del contenedor dentro del pod.
    - **`image: shinjimc/frontend:latest`**: imagen Docker que contiene la aplicación frontend.
    - **`imagePullPolicy: Always`**: garantiza que siempre se obtenga la última versión de la imagen.
    - **`ports.containerPort: 80`**: puerto interno que expone el contenedor para HTTP.

- **2. Service: `frontend`**

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

  - **`apiVersion: v1` y `kind: Service`**: Define un **Service**, que expone los pods del frontend **a la red interna y externa**.

  - **`metadata.name: frontend`**: Nombre del Service usado para referenciarlo en el clúster.

  - **`spec.type: NodePort`**: Permite que el servicio sea accesible desde fuera del clúster a través del puerto del nodo físico.

  - **`selector: app: frontend`**: Selecciona los pods etiquetados como `frontend` para enrutarles el tráfico.

  - **`ports`**:

    - `port: 80` → puerto expuesto dentro del clúster.
    - `targetPort: 80` → puerto interno del contenedor que recibe las solicitudes HTTP.
    - `nodePort: 30080` → puerto del nodo que permite acceder al servicio desde fuera del clúster.

---

### mongo-deployment.yaml

- **1. Service interno: `mongo-service`**

  ```yaml
  apiVersion: v1
  kind: Service
  metadata:
    name: mongo-service
    labels:
      app: mongo
  spec:
    type: ClusterIP
    selector:
      app: mongo
    ports:
      - protocol: TCP
        port: 27017
        targetPort: 27017
  ```

  - **`apiVersion: v1` y `kind: Service`**: Define un **Service**, que expone los pods de MongoDB **solo dentro del clúster**.

  - **`metadata.name: mongo-service`**: Nombre del Service, utilizado por otros microservicios para conectarse a MongoDB.

  - **`spec.type: ClusterIP`**: Tipo de Service que **solo es accesible desde dentro del clúster**, protegiendo la base de datos de accesos externos directos.

  - **`selector: app: mongo`**: Selecciona los pods etiquetados como `mongo` para enrutarles el tráfico interno.

  - **`ports`**:

    - `port: 27017` → puerto expuesto dentro del clúster.
    - `targetPort: 27017` → puerto interno del contenedor MongoDB que recibe las solicitudes.

- **2. Deployment: `mongo`**

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
            emptyDir: {}
  ```

  - **`apiVersion: apps/v1` y `kind: Deployment`**: Define un **Deployment** que asegura que al menos un pod de MongoDB esté corriendo.

  - **`metadata.name: mongo`**: Nombre del Deployment dentro del clúster.

  - **`spec.replicas: 1`**: Mantiene **1 pod de MongoDB**, suficiente para este entorno de desarrollo, aunque en producción se recomendaría un **StatefulSet** para replicación y persistencia.

  - **`selector.matchLabels` y `template.metadata.labels`**: Etiquetas que identifican los pods gestionados por este Deployment.

  - **`containers`**:

    - **`name: mongo`**: nombre del contenedor.
    - **`image: mongo:6.0`**: imagen oficial de MongoDB versión 6.0.
    - **`ports.containerPort: 27017`**: puerto donde MongoDB escucha solicitudes.
    - **`env`**: variables para inicializar el usuario root (`admin`) y contraseña (`adminpass`).
    - **`volumeMounts`**: monta un volumen llamado `mongo-storage` en `/data/db` para almacenar los datos de MongoDB dentro del pod.

  - **`volumes`**:

    - `emptyDir: {}` → volumen temporal que se elimina si el pod se destruye. En producción, se usaría un **PersistentVolume** para garantizar persistencia.

- **3. Service externo opcional: `mongo`**

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

  - Similar al Service interno, pero aquí sirve para **posible acceso interno o externo controlado**, aunque normalmente se recomienda usar solo `mongo-service` como referencia interna.

---

## Author

- **ShinjiMC** - [GitHub Profile](https://github.com/ShinjiMC)

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
