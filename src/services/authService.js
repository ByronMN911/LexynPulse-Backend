const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

/*
 * Procesa la lógica de autenticación del usuario.
 * Valida la existencia del correo, compara las firmas de contraseña
 * y genera un token JWT firmado de 128 bits con expiración programada.
 */
const iniciarSesion = async (correo, password) => {
    const usuario = await userModel.buscarPorCorreo(correo);
    if (!usuario) {
        throw new Error('Credenciales inválidas o cuenta inactiva.');
    }

    // Compara la contraseña en texto plano con el hash asimétrico almacenado
    const passwordValido = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValido) {
        throw new Error('Credenciales inválidas o cuenta inactiva.');
    }

    // Genera el payload sin información altamente sensible
    const tokenPayload = {
        id: usuario.id,
        nombre: usuario.nombre_completo,
        correo: usuario.correo,
        rol: usuario.rol_nombre
    };

    // Firma el token utilizando la variable simétrica del entorno
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '8h' });

    return {
        usuario: {
            id: usuario.id,
            nombre: usuario.nombre_completo,
            correo: usuario.correo,
            rol: usuario.rol_nombre,
            empresa_nombre: usuario.empresa_nombre
        },
        token
    };
};

/*
 * Procesa el registro de nuevos usuarios en el sistema (Clientes o Administradores).
 * Realiza el proceso de hashing con sal de la contraseña y asigna
 * de manera dinámica el rol enviado por el administrador ejecutor.
 */
const registrarUsuario = async (datosUsuario) => {
    const usuarioExistente = await userModel.buscarPorCorreo(datosUsuario.correo);
    if (usuarioExistente) {
        throw new Error('El correo electrónico ya se encuentra registrado.');
    }

    // Encriptación segura irreversible de la clave de usuario
    const salt = await bcrypt.genSalt(10);
    datosUsuario.password_hash = await bcrypt.hash(datosUsuario.password, salt);
    
    /*
     * Asignación dinámica del rol. 
     * Si no se especifica explícitamente en el payload, el sistema
     * adopta por seguridad el Rol 2 (CLIENTE) como contingencia.
     */
    datosUsuario.rol_id = datosUsuario.rol_id || 2; 

    return await userModel.crearUsuario(datosUsuario);
};

/*
 * Consume la capa de persistencia para listar los clientes registrados en la plataforma.
 */
const listarClientesSistema = async () => {
    return await userModel.obtenerTodosClientes();
};

/*
 * Orquesta la actualización de los metadatos de usuario.
 * Aplica hashing seguro si se solicitó un blanqueo de contraseña y previene colisión de correos.
 */
const administrarEstadoUsuario = async (id, datosActualizados) => {
    // 1. Prevención de colisión de correos
    if (datosActualizados.correo) {
        const usuarioConEseCorreo = await userModel.buscarPorCorreo(datosActualizados.correo);
        // Si el correo existe y le pertenece a un ID diferente al que estamos editando
        if (usuarioConEseCorreo && usuarioConEseCorreo.id !== id) {
            throw new Error('El correo ingresado ya pertenece a otra cuenta corporativa registrada.');
        }
    }

    // 2. Procesamiento de seguridad (Hashing) si el Admin envió una nueva clave
    if (datosActualizados.password) {
        const salt = await bcrypt.genSalt(10);
        datosActualizados.password_hash = await bcrypt.hash(datosActualizados.password, salt);
    }

    const resultado = await userModel.actualizarUsuarioPorAdmin(id, datosActualizados);
    if (!resultado) {
        throw new Error('El usuario especificado para modificación no existe.');
    }
    return resultado;
};

module.exports = {
    iniciarSesion,
    registrarUsuario,
    listarClientesSistema,
    administrarEstadoUsuario
};