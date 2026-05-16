<h1>Medisoft Sistema Integral de Gestión de Incapacidades</h1>

<p><strong>Autores:</strong> Alejandro Osorio, Juan Esteban Albaran y Nicolás Botero.</p>

<p>Medisoft es una plataforma web integral desarrollada para la gestión centralizada, el seguimiento detallado y el proceso de cobro de incapacidades médicas y licencias en el entorno corporativo. El propósito central de este sistema es automatizar y facilitar la comunicación y el flujo de trabajo entre los empleados y los distintos departamentos de la empresa, incluyendo el área de Gestión Humana, el departamento de contabilidad, el área jurídica y la gerencia general.</p>

<details>
  <summary><strong>Tecnologías y Arquitectura</strong></summary>
  <br>
  <p>El proyecto está construido utilizando un conjunto de tecnologías modernas que garantizan un alto rendimiento y una estricta seguridad en el manejo de tipos de datos. La estructura principal de la aplicación se basa en el marco de trabajo Next.js aprovechando su enrutador de aplicaciones. El lenguaje de programación base es TypeScript, lo cual asegura una arquitectura robusta. Para el diseño y la interfaz de usuario se emplea Tailwind CSS junto con los componentes de diseño de shadcn y Radix UI, logrando una experiencia de usuario fluida y consistente. La persistencia de la información se maneja localmente mediante una base de datos SQLite, la cual es gestionada a través del mapeador relacional de objetos Prisma. Todo el manejo de paquetes e instalación de dependencias se realiza utilizando Bun.</p>
</details>

<details>
  <summary><strong>Perfiles y Roles del Sistema</strong></summary>
  <br>
  <p>El sistema se divide lógicamente según los diferentes perfiles de usuario que interactúan con la plataforma. Los empleados regulares cuentan con herramientas diseñadas exclusivamente para registrar nuevas incapacidades y licencias, consultar el progreso de sus aprobaciones o rechazos, gestionar de forma proactiva sus prórrogas y adjuntar documentos adicionales para subsanar errores reportados por sus supervisores.</p>
  <p>Por otro lado, el rol de Gestión Humana es el núcleo operativo de Medisoft. Estos usuarios tienen la enorme responsabilidad de validar exhaustivamente las incapacidades que radican los empleados, realizar la transcripción oficial ante las Entidades Promotoras de Salud y las Administradoras de Riesgos Laborales, y llevar un control estricto de los cobros monetarios a estas entidades. Además de esto, el personal operativo realiza un seguimiento profundo a los casos médicos complejos que superan los noventa o ciento ochenta días, gestionando las prórrogas extendidas y las solicitudes formales de rehabilitación correspondientes.</p>
  <p>El área de contabilidad tiene a su disposición un módulo dedicado de forma exclusiva a la conciliación bancaria de los pagos efectuados por las diferentes entidades de salud, así como al control financiero de los reintegros pertinentes. Paralelamente a estos procesos, el área jurídica interviene siempre que el flujo regular de cobros presenta obstáculos insalvables. Los abogados de la empresa utilizan el sistema para gestionar formalmente los rechazos y glosas que emiten las entidades prestadoras, iniciar procesos formales de cobro persuasivo y cobro jurídico, y llevar un registro minucioso de la emisión de derechos de petición orientados en todo momento a recuperar el dinero de la compañía.</p>
  <p>A un nivel estratégico superior, la gerencia corporativa tiene acceso directo a tableros de control interactivos y reportes ejecutivos consolidados. Esto permite a los directores realizar auditorías generales instantáneas y tener una visión global e inmediata del estado financiero y operativo de la cartera total de incapacidades. Finalmente, para mantener el sistema operando sin contratiempos, el administrador técnico cuenta con un panel especializado para la creación y gestión segura de usuarios, la asignación de roles de seguridad internos, la configuración detallada de la información de las diferentes entidades de salud y la modificación centralizada de los parámetros globales que rigen los cálculos y tiempos de respuesta de toda la plataforma.</p>
</details>

<details>
  <summary><strong>Instrucciones de Despliegue Local</strong></summary>
  <br>
  <p>Para desplegar y ejecutar esta aplicación de manera efectiva en un entorno de desarrollo local, es estrictamente necesario tener instalados Node.js en su versión dieciocho o superior, así como el eficiente gestor de paquetes Bun. El primer paso crucial consiste en instalar todas las dependencias del proyecto ejecutando el comando de instalación propio de Bun.</p>
  <p>Posteriormente, el administrador debe asegurar que la base de datos local SQLite esté completamente lista y sincronizada; para lograr esto el proyecto incluye comandos de terminal predefinidos en Bun que generan rápidamente el cliente de Prisma y pueblan la base de datos con información semilla inicial en caso de ser requerido. Una vez configurado correctamente todo el entorno, el servidor de desarrollo se inicia con un simple comando de Bun, quedando la interfaz de la aplicación inmediatamente disponible a través del puerto tres mil del servidor local web.</p>
</details>

<details>
  <summary><strong>Estructura de Carpetas y Lógica de Negocio</strong></summary>
  <br>
  <p>La arquitectura interna de carpetas separa de forma inmaculada las distintas responsabilidades del código fuente. Las rutas principales de navegación y la interfaz de programación de aplicaciones se encuentran alojadas de manera altamente organizada. Los componentes visuales modulares y reutilizables, así como los ganchos de código personalizados de React y las utilidades compartidas para el cálculo estricto de normas laborales y autenticación interna de usuarios, tienen directorios específicos que facilitan inmensamente su futura actualización y mantenimiento.</p>
  <p>La lógica de negocio subyacente incluye la encriptación segura de contraseñas y datos sensibles, junto con el cálculo dinámico y automático de proporciones de pago según la rigurosa normatividad legal laboral vigente, asegurando por ejemplo la correcta distribución de cargas económicas entre el empleador y la entidad de salud después del segundo día consecutivo de incapacidad de un empleado. Todo este ecosistema tecnológico está diseñado estructuralmente para ofrecer una herramienta robusta, altamente mantenible y excepcionalmente eficiente para cualquier organización.</p>
</details>
