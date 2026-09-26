# ⚽ Sistema de Gestión de Liga de Fútbol Pro (2026)

Sistema web integral para la gestión de campeonatos de fútbol desarrollado con arquitectura N-capas en **Spring Boot 3 + MySQL** en el backend y **HTML5 + Bootstrap 5 + Tailwind CSS + JavaScript ES6** en el frontend (servido estáticamente sin dependencias de Node.js ni configuración de CORS).

---

## 📋 Requisitos Previos

1. **Java JDK 17 o superior** (el proyecto incluye Maven Wrapper preconfigurado).
2. **MySQL Server 8.0+** o **XAMPP / MariaDB 10.4+** en el puerto local por defecto (`3306`).

---

## 🗄️ 1. Creación de la Base de Datos

El proyecto incluye el archivo [`script.sql`](file:///c:/Users/Usuario/Documents/ghitub/sistemaFutbol/script.sql) listo para ejecutar:

1. Abra **MySQL Workbench**, **phpMyAdmin** o su cliente MySQL preferido.
2. Abra y ejecute el contenido de [`script.sql`](file:///c:/Users/Usuario/Documents/ghitub/sistemaFutbol/script.sql).
3. Este script realiza automáticamente:
   - `DROP DATABASE IF EXISTS liga_futbol;`
   - Creación de la base de datos `liga_futbol`.
   - Creación de las tablas `equipos` y `encuentros` con sus restricciones y claves foráneas.
   - Inserción de 6 equipos oficiales y 6 encuentros de prueba con resultados y fechas.

---

## ⚙️ 2. Configuración de Credenciales de MySQL

Abra el archivo [`src/main/resources/application.properties`](file:///c:/Users/Usuario/Documents/ghitub/sistemaFutbol/src/main/resources/application.properties) y verifique sus credenciales locales:

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/liga_futbol?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true&characterEncoding=UTF-8
spring.datasource.username=root
spring.datasource.password=Osafael456*
spring.jpa.hibernate.ddl-auto=update
```
> **Nota:** Cambie `spring.datasource.password` si su contraseña de MySQL local es diferente (ej. vacía `""` o `"root"`).

---

## 🚀 3. Cómo Correr el Proyecto (Un Solo Comando)

En la terminal (dentro de la carpeta raíz del proyecto):

### En Windows (PowerShell / CMD):
```powershell
.\mvnw.cmd spring-boot:run
```

### En Linux / macOS:
```bash
./mvnw spring-boot:run
```

*(O si tiene Maven instalado globalmente: `mvn spring-boot:run`)*

---

## 🌐 4. Acceso al Sistema

Una vez iniciado el servidor, abra su navegador en:

👉 **[http://localhost:8080](http://localhost:8080)**

---

## 📌 Características Implementadas

- **Arquitectura N-capas en paquete `com.liga.futbol`**:
  - `entity`: `Equipo`, `Encuentro`
  - `repository`: `EquipoRepository`, `EncuentroRepository`
  - `dto`: `EquipoDTO`, `EncuentroRequestDTO`, `EncuentroResponseDTO`, `TablaPosicionDTO`, `ErrorResponseDTO`
  - `service`: `EquipoService`, `EncuentroService` (con validación de negocio)
  - `controller`: `EquipoController`, `EncuentroController`
  - `exception`: `GlobalExceptionHandler` con respuestas de error JSON estructuradas.
- **11 Endpoints REST completos**:
  - `POST /api/equipos`, `GET /api/equipos`, `GET /api/equipos/{id}`, `PUT /api/equipos/{id}`, `DELETE /api/equipos/{id}`
  - `POST /api/encuentros`, `GET /api/encuentros`, `GET /api/encuentros/{id}`, `PUT /api/encuentros/{id}`, `DELETE /api/encuentros/{id}`
  - `GET /api/encuentros/tabla-posiciones`
- **Reglas de negocio validadas**:
  - Un equipo no puede enfrentarse a sí mismo.
  - Goles $\ge 0$.
  - Ambos equipos deben existir.
  - Puntaje: Victoria = 3 pts, Empate = 1 pto, Derrota = 0 pts.
  - Criterio de desempate en tabla: 1° Puntos, 2° Diferencia de gol, 3° Goles a favor, 4° Alfabético.
- **Frontend Moderno 2026**:
  - Bootstrap 5 + Tailwind CSS (vía CDN sin npm build ni Node).
  - Tema oscuro con estética de estadio (acentos verde esmeralda y pizarra).
  - Scoreboard con podio en vivo (Oro 👑, Plata 🥈, Bronce 🥉).
  - Modales para Crear/Editar y Bootstrap Toasts para notificaciones.
