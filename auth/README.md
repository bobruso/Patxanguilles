# Sistema de cuentas — MVP de prueba

Rama: `feature/accounts-auth`

## Estado

Este módulo es independiente del `index.html` principal para poder probar identidad sin interferir con el desarrollo general de Patxanguilles.

Incluye:

- login con Supabase Auth (email + contraseña)
- sesión persistente
- vínculo 1:1 entre `auth.users` / `profiles` y `players`
- rol `user` / `admin`
- generación de invitaciones de un solo uso por el admin
- código de 6 cifras con caducidad de 7 días
- registro de jugador + reclamación segura de su ficha
- panel admin básico de estado de cuentas

## Antes de probar altas nuevas

En Supabase Dashboard:

`Authentication > Providers > Email`

Desactivar **Confirm email**.

La intención de Patxanguilles es que, tras registrarse con email + contraseña y un código válido, el usuario obtenga sesión inmediatamente sin tener que abrir el correo.

## Prueba local

1. Cambiar a la rama `feature/accounts-auth`.
2. Servir el repositorio por HTTP local (no abrir el HTML con `file://`).
3. Abrir `/auth/`.
4. Iniciar sesión con la cuenta admin existente.
5. Confirmar que aparece la ficha de Jorge y el rol ADMINISTRADOR.
6. En el panel de invitaciones, generar un código para un jugador sin cuenta.
7. Cerrar sesión.
8. Crear una cuenta nueva usando ese jugador, el código generado, un email de prueba válido y una contraseña.
9. Confirmar que la cuenta queda vinculada al jugador y el código deja de ser reutilizable.
10. Cerrar y volver a abrir el navegador para comprobar la persistencia de la sesión.

## Importante

Todavía NO se han reemplazado las políticas RLS generales de `players`. Se mantienen temporalmente para no romper la web principal mientras esta rama no está integrada.

La siguiente fase, una vez validado este MVP, será:

- integrar identidad en el `index.html`
- mostrar usuario actual en la navegación
- aplicar permisos de edición de ficha por propietario/admin
- registrar autoría de resultados, goles y fotos
- vincular entrenadores del draft con el usuario autenticado
- endurecer las políticas RLS de `players` y las tablas afectadas
