# Guía de Ejecución Rápida

## 1. Requisitos Previos

- **Java 17** o superior instalado (`java -version`).
- **Base de Datos Activa:**
  - **Opción A (MySQL Workbench / MySQL Server):** Servicio MySQL activo en puerto `3306`.
  - **Opción B (XAMPP / WampServer / phpMyAdmin):** Módulo MySQL / MariaDB iniciado en el Panel de Control de XAMPP.

---

## 2. Base de Datos (`bd_encuentrosdeportivos`)

Ejecutar el script SQL de inicialización ubicado en la raíz del proyecto (`script.sql`):

- **En phpMyAdmin (XAMPP / WampServer):**
  1. Abrir `http://localhost/phpmyadmin` en el navegador.
  2. Ir a la pestaña **Importar**.
  3. Seleccionar el archivo `script.sql` ubicado en la raíz del proyecto.
  4. Hacer clic en **Continuar** (se creará automáticamente la base de datos `bd_encuentrosdeportivos` con sus tablas y datos de prueba).

- **En MySQL Workbench o Terminal CLI:**
  1. Abrir MySQL Workbench o la consola de MySQL.
  2. Abrir y ejecutar todo el contenido del archivo `script.sql`.

---

## 3. Configurar Credenciales y Dialecto (`application.properties`)

Abrir el archivo `src/main/resources/application.properties` y verificar los siguientes parámetros:

```properties
# Credenciales de conexión
spring.datasource.username=root
spring.datasource.password=  # Dejar vacío en XAMPP por defecto o colocar su clave

# Compatibilidad para phpMyAdmin / MariaDB y MySQL 8+
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MySQLDialect
```

> **Nota de compatibilidad (phpMyAdmin / MariaDB):** La propiedad `spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MySQLDialect` evita errores de autodetección de metadatos de Hibernate 6 al conectarse a MariaDB.

---

## 4. Levantar el Proyecto

Abrir una terminal en la carpeta raíz del proyecto y ejecutar:

- **En Windows (CMD / PowerShell):**
  ```cmd
  .\mvnw spring-boot:run
  ```

- **En Mac / Linux:**
  ```bash
  ./mvnw spring-boot:run
  ```

---

## 5. Abrir la Aplicación

Ir al navegador e ingresar a:

👉 **http://localhost:8081**

*(Nota: El servidor Tomcat está configurado en el puerto `8081`).*