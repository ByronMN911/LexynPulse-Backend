const authService = require('../services/authService');

/**
 * ============================================================================
 * CONTROLADOR DE AUTENTICACIÓN - INICIO DE SESIÓN
 * ============================================================================
 * Valida las credenciales recibidas desde el cliente y delega el proceso
 * de autenticación al servicio de negocio.
 */
const login = async (req, res) => {
    try {
        // Extracción de credenciales enviadas desde el frontend
        const { correo, password } = req.body;

        // Validación de campos obligatorios
        if (!correo || !password) {
            return res.status(400).json({
                message: 'Todos los campos son obligatorios.'
            });
        }

        // Delegación del proceso de autenticación al servicio
        const resultado = await authService.iniciarSesion(correo, password);

        // Retorno exitoso con token y datos del usuario autenticado
        return res.status(200).json(resultado);

    } catch (error) {
        // Respuesta controlada ante credenciales inválidas o errores de autenticación
        return res.status(401).json({
            message: error.message
        });
    }
};

/**
 * ============================================================================
 * CONTROLADOR DE REGISTRO DE USUARIOS
 * ============================================================================
 * Permite al administrador registrar nuevos clientes corporativos dentro
 * del sistema, aplicando validaciones de integridad y seguridad.
 */
const registrar = async (req, res) => {
    try {

        // Extracción de datos enviados desde el formulario de registro
        const {
            nombre_completo,
            correo,
            password,
            rol_id,
            empresa_nombre,
            empresa_tamano,
            empresa_sector
        } = req.body;

        // Validación de obligatoriedad de todos los campos requeridos
        if (
            !nombre_completo ||
            !correo ||
            !password ||
            !empresa_nombre ||
            !empresa_tamano ||
            !empresa_sector
        ) {
            return res.status(400).json({
                message: 'Hackeo detectado: Todos los campos del formulario son obligatorios.'
            });
        }

        /**
         * Validación de formato de correo electrónico mediante
         * expresión regular estándar.
         */
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(correo)) {
            return res.status(400).json({
                message: 'Formato de correo electrónico inválido.'
            });
        }

        /**
         * ============================================================================
         * REGLA DE SEGURIDAD DE CONTRASEÑAS
         * ============================================================================
         * Requisitos mínimos:
         * - Al menos una letra minúscula
         * - Al menos una letra mayúscula
         * - Al menos un número
         * - Al menos un símbolo especial
         * - Longitud mínima de 6 caracteres
         */
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/;

        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                message: 'La contraseña debe incluir al menos una mayúscula, una minúscula, un número, un símbolo especial y mínimo 6 caracteres.'
            });
        }

        // Registro del nuevo usuario corporativo en la capa de servicios
        const nuevoUsuario = await authService.registrarUsuario({
            nombre_completo,
            correo,
            password,
            rol_id,
            empresa_nombre,
            empresa_tamano,
            empresa_sector
        });

        // Respuesta exitosa con los datos del usuario creado
        return res.status(201).json({
            message: 'Usuario registrado exitosamente por el administrador del sistema.',
            usuario: nuevoUsuario
        });

    } catch (error) {

        // Manejo controlado de errores de negocio o validaciones
        return res.status(400).json({
            message: error.message
        });
    }
};

/**
 * ============================================================================
 * CONTROLADOR DE ACTUALIZACIÓN DE CLIENTES
 * ============================================================================
 * Permite modificar información institucional de una cuenta corporativa
 * existente y administrar su estado de acceso.
 */
const actualizarCliente = async (req, res) => {
    try {

        // Identificador del usuario recibido desde la URL
        const { id } = req.params;

        // Datos enviados desde el formulario de edición
        const {
            nombre_completo,
            correo,
            password,
            empresa_nombre,
            empresa_tamano,
            empresa_sector,
            activo
        } = req.body;

        // Validación de datos institucionales obligatorios
        if (
            !nombre_completo ||
            !correo ||
            !empresa_nombre ||
            !empresa_tamano ||
            !empresa_sector
        ) {
            return res.status(400).json({
                message: 'Todos los datos institucionales son obligatorios para actualizar el perfil.'
            });
        }

        /**
         * Validación de formato de correo corporativo.
         */
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(correo)) {
            return res.status(400).json({
                message: 'Formato de correo electrónico corporativo inválido.'
            });
        }

        /**
         * ============================================================================
         * VALIDACIÓN CONDICIONAL DE CONTRASEÑA
         * ============================================================================
         * Solo se ejecuta cuando el administrador decide establecer
         * una nueva contraseña para el usuario.
         */
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/;

        if (password && !passwordRegex.test(password)) {
            return res.status(400).json({
                message: 'La nueva contraseña debe incluir al menos una mayúscula, una minúscula, un número, un símbolo especial y mínimo 6 caracteres.'
            });
        }

        // Actualización de la información corporativa en la capa de negocio
        const resultado = await authService.administrarEstadoUsuario(id, {
            nombre_completo,
            correo,
            password,
            empresa_nombre,
            empresa_tamano,
            empresa_sector,
            activo
        });

        // Confirmación de actualización exitosa
        return res.status(200).json({
            message: 'Registro corporativo actualizado con éxito.',
            usuario: resultado
        });

    } catch (error) {

        // Manejo centralizado de errores de actualización
        return res.status(400).json({
            message: error.message
        });
    }
};

/**
 * ============================================================================
 * CONTROLADOR DE CONSULTA DE CLIENTES
 * ============================================================================
 * Recupera el directorio completo de clientes registrados en el sistema
 * para su visualización dentro del módulo administrativo.
 */
const obtenerClientes = async (req, res) => {
    try {

        // Consulta de clientes en la capa de servicios
        const clientes = await authService.listarClientesSistema();

        // Respuesta exitosa con el listado completo
        return res.status(200).json(clientes);

    } catch (error) {

        // Error de infraestructura o acceso a datos
        return res.status(500).json({
            message: 'Error al listar las cuentas de clientes.'
        });
    }
};

/**
 * ============================================================================
 * EXPORTACIÓN DE CONTROLADORES
 * ============================================================================
 * Expone las funciones para ser utilizadas por las rutas Express.
 */
module.exports = {
    login,
    registrar,
    obtenerClientes,
    actualizarCliente
};