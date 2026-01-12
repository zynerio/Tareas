# Zynerio Tareas

Un gestor de tareas moderno, eficiente y colaborativo, diseñado para organizar tus proyectos personales y profesionales. Desarrollado en PHP con una arquitectura MVC ligera y sin dependencias pesadas.

![Zynerio Tareas Logo](public/img/zynerio_logob.png)

## 🚀 Características Principales

*   **Gestión de Proyectos**: Crea múltiples proyectos, personalízalos con colores y mantén tu trabajo organizado.
*   **Tareas y Subtareas**: Desglosa tus actividades en tareas manejables con descripciones ricas y notas adicionales.
*   **Importación Avanzada**: Carga listas de tareas masivamente desde archivos `.txt`. El sistema reconoce automáticamente estructuras y estados de finalización (ej. "Tarea, Sí").
*   **Colaboración**: Comparte proyectos con otros usuarios del sistema. Los usuarios pueden ver en qué proyectos colaboran mediante distintivos claros.
*   **Etiquetas Personalizadas**: Clasifica tus tareas con etiquetas de colores para un filtrado visual rápido.
*   **Modo Informe**: Genera reportes limpios y profesionales de tus proyectos, optimizados para impresión o exportación a PDF.
*   **Interfaz Intuitiva**: Diseño responsivo y amigable (Bootstrap 5) con soporte para arrastrar y soltar (Drag & Drop) para reordenar tareas.
*   **Roles de Usuario**: Sistema de permisos con roles de Administrador y Usuario estándar.

## 📋 Requisitos

*   PHP >= 7.4
*   MySQL / MariaDB
*   Extensión PDO PHP
*   Servidor Web (Apache/Nginx) con `mod_rewrite` habilitado.

## 🛠️ Instalación

### Opción 1: Instalación Manual (XAMPP/WAMP/LAMP)

1.  **Clonar/Descargar** el proyecto en tu carpeta pública (`htdocs`, `www`, etc.).
2.  **Permisos**: Asegúrate de que la carpeta `storage/logs` tenga permisos de escritura.
3.  **Instalación Automática**:
    *   Accede a la URL del proyecto (ej. `http://localhost/tareas/install`).
    *   Sigue el asistente para configurar la conexión a la base de datos y crear el usuario administrador.
4.  **Instalación Manual (Alternativa)**:
    *   Crea una base de datos vacía.
    *   Importa el archivo `database.sql`.
    *   Configura manualmente `app/Config/config.php` (puedes usar el formato generado por el instalador).

### Opción 2: Docker-> en desarrollo

El proyecto incluye una configuración lista para Docker en la carpeta `Version docker`.

1.  Navega a la carpeta `Version docker`.
2.  Ejecuta `docker-compose up -d`.
3.  Accede a `http://localhost:8000` (o el puerto configurado).

## 📖 Uso

### Importación de Tareas
Puedes importar tareas rápidamente subiendo un archivo de texto. Formatos soportados:
*   **Lista simple**: Una tarea por línea.
*   **Estado**: `Nombre de tarea, Sí` (para completada) o `Nombre de tarea, No` (para pendiente).
*   **Estructura**: Usa guiones o números para jerarquías simples.

Consulta la sección de **Ayuda** en la aplicación para ver ejemplos detallados.

## 🔄 Actualizaciones

La aplicación comprueba automáticamente si existen nuevas versiones disponibles en GitHub y te mostrará una notificación en la barra superior si hay una actualización pendiente.

### Pasos para actualizar:

1.  **Copia de Seguridad**: Antes de nada, realiza una copia de seguridad de tu base de datos y de tus archivos (especialmente `app/Config/config.php`).
2.  **Descargar**: Obtén la última versión desde la sección de [Releases en GitHub](https://github.com/zynerio/tareas/releases).
3.  **Reemplazar Archivos**: Descomprime y sobrescribe los archivos de tu instalación con los nuevos.
    *   **Importante**: Intenta conservar tu archivo `app/Config/config.php` existente para no perder la configuración de conexión. Si lo sobrescribes, simplemente tendrás que volver a introducir los datos de la base de datos.
4.  **Actualizar Base de Datos**:
    *   Navega a la carpeta de instalación en tu navegador (ej. `http://localhost/tareas/install`).
    *   Verás un panel de "Actualización de esquema".
    *   Haz clic en el botón **"Actualizar esquema"**. Esto añadirá cualquier tabla o columna nueva necesaria para la nueva versión sin borrar tus datos.

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Si encuentras un error o tienes una idea para mejorar, no dudes en abrir un Issue o enviar un Pull Request.

## 📄 Licencia

Este proyecto es Open Source.
