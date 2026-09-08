# Sistema de cuentas — MVP de prueba

Rama: `feature/accounts-auth`

## Objetivo

Introducir cuentas de forma progresiva sin obligar todavía a iniciar sesión para utilizar la web actual. La identidad será obligatoria para funcionalidades nuevas que necesiten saber inequívocamente quién actúa, empezando por **Reto del día**.

El módulo `/auth/` permanece separado del `index.html` principal para poder desarrollar y probar el sistema sin interferir con Patxanguilles operativa.

## Modelo de identidad

- `auth.users` mantiene la sesión de Supabase.
- `profiles.id` enlaza con `auth.users.id`.
- `profiles.player_id` enlaza 1:1 con `players.id`.
- Un jugador solo puede tener una cuenta.
- Una cuenta solo puede representar a un jugador.
- Roles actuales: `user` y `admin`.
- La cuenta admin existente sigue siendo compatible.

## Registro nuevo

Las cuentas nuevas NO requieren email visible para el usuario.

Flujo:

1. El usuario abre **Crear cuenta**.
2. Selecciona su jugador de una lista de jugadores que todavía no tienen cuenta.
3. Elige y repite una contraseña.
4. Pulsa **Solicitar registro**.
5. La cuenta todavía NO se crea.
6. El administrador recibe en Telegram el jugador seleccionado y un código de 6 cifras.
7. La pantalla muestra **Pide el código al administrador**.
8. El usuario introduce el código recibido del administrador.
9. Si el código es correcto, se crea la cuenta, se vincula a `players.id` y se inicia sesión.
10. Ese jugador desaparece automáticamente de la lista de jugadores disponibles para registro.

El código caduca a las 24 horas y tiene un máximo de 5 intentos.

## Login

El login normal es:

- Jugador
- Contraseña

No se solicita email.

La cuenta admin anterior al nuevo sistema se mantiene compatible: el servidor detecta que utiliza credenciales `native` y valida su contraseña actual.

## Telegram

El panel admin incluye **Probar Telegram**. Esta prueba no crea jugadores ni solicitudes de registro; únicamente comprueba que el canal de notificaciones está funcionando.

Cuando haya una solicitud real, Telegram deberá mostrar aproximadamente:

- nombre/apodo del jugador reclamado
- código de 6 cifras
- aviso de que la cuenta todavía no ha sido creada
- caducidad del código

## Seguridad transitoria

La incorporación de cuentas es gradual. Se mantienen las políticas `anon` que usa la web actual para no romper el funcionamiento sin login.

Sin embargo, una cuenta `authenticated` recién creada pero todavía no vinculada a un jugador no puede aprovechar permisos antiguos de autenticados para modificar jugadores, partidos, eventos, GPS o Storage.

En esta fase, los usuarios vinculados todavía conservan parte de los permisos amplios históricos para mantener compatibilidad. El bloqueo definitivo propietario/admin se activará cuando integremos identidad en las funcionalidades existentes.

## Prueba local

1. `git fetch origin`
2. `git switch feature/accounts-auth`
3. Servir el repositorio por HTTP local, por ejemplo `python -m http.server 8000`.
4. Abrir `http://localhost:8000/auth/`.
5. Entrar como Jorge seleccionando el jugador y usando la contraseña de la cuenta admin existente.
6. Confirmar que aparece `ADMINISTRADOR`.
7. Pulsar **Probar Telegram** y confirmar la recepción del mensaje.
8. Revisar que en **Crear cuenta** aparecen los jugadores sin cuenta y que Jorge ya no aparece disponible para registro.
9. No completar todavía el alta de un jugador real salvo que esa persona esté participando en la prueba.
10. Abrir `http://localhost:8000/retos/` para comprobar que esa zona exige una cuenta vinculada.

## Despliegue gradual previsto

1. Sistema de cuentas opcional.
2. `SIGN IN / jugador` discreto en la Home.
3. Reto del día: login obligatorio.
4. Autoría de resultados, goles, fotos y acciones.
5. Draft: identificar automáticamente a los entrenadores y excluirlos de los jugadores fichables.
6. Perfil: propietario o admin.
7. Carta de jugador: propietario o admin.
8. Endurecimiento final de RLS y permisos de todas las acciones sensibles.

## Importante

`main` no contiene todavía la interfaz de cuentas. La web publicada sigue utilizando el flujo existente. Las tablas y funciones añadidas a Supabase son aditivas y se han diseñado para convivir durante esta transición.