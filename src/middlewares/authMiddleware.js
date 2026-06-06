const jwt = require('jsonwebtoken');

/*
 * Intercepta la petición HTTP para comprobar la validez del token JWT.
 * Extrae el token desde la cabecera 'Authorization' y guarda los datos de sesión en 'req.user'.
 */
const verificarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Formato esperado: Bearer <TOKEN>

    if (!token) {
        return res.status(401).json({ message: 'Acceso denegado. Token no suministrado.' });
    }

    try {
        const verificado = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verificado; // Adjunta el payload a la solicitud para la siguiente capa
        next(); // Permite avanzar al controlador
    } catch (error) {
        return res.status(403).json({ message: 'Token inválido o expirado.' });
    }
};

/*
 * Middleware de clausura para el Control de Acceso Basado en Roles (RBAC).
 * Verifica si el rol inyectado en el token coincide con los permitidos para el endpoint.
 */
const permitirRoles = (...rolesPermitidos) => {
    return (req, res, next) => {
        if (!req.user || !rolesPermitidos.includes(req.user.rol)) {
            return res.status(403).json({ 
                message: 'Acceso prohibido. No cuenta con los privilegios requeridos para esta acción.' 
            });
        }
        next();
    };
};

module.exports = {
    verificarToken,
    permitirRoles
};