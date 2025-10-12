# 🔥 Endpoint de Registro Automático con Google

## 📋 **Endpoint a implementar en el backend:**

```javascript
// POST /api/v1/auth/google
app.post('/api/v1/auth/google', async (req, res) => {
  try {
    const { idToken, userData } = req.body;
    
    // 1. Verificar el token de Firebase
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // 2. Buscar si el usuario ya existe
    let user = await User.findOne({ 
      $or: [
        { email: decodedToken.email },
        { firebaseUid: decodedToken.uid }
      ]
    });
    
    // 3. Si no existe, crear nuevo usuario
    if (!user) {
      user = new User({
        id: decodedToken.uid,
        name: userData.name,
        lastname: userData.lastname,
        email: decodedToken.email,
        phone: userData.phone || '', // Campo vacío por defecto
        role: userData.role || 'user',
        sessionVersion: 1,
        profileImage: userData.profileImage || '',
        firebaseUid: decodedToken.uid,
        emailVerified: decodedToken.email_verified,
        createdAt: new Date()
      });
      
      await user.save();
      console.log('✅ Usuario registrado automáticamente:', user.email);
    } else {
      console.log('✅ Usuario existente encontrado:', user.email);
    }
    
    // 4. Generar token JWT para la app
    const jwtToken = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // 5. Responder con éxito
    res.json({
      success: true,
      message: user.isNew ? 'Usuario registrado exitosamente' : 'Login exitoso',
      data: {
        user: {
          id: user.id,
          name: user.name,
          lastname: user.lastname,
          email: user.email,
          phone: user.phone,
          role: user.role,
          profileImage: user.profileImage
        },
        token: jwtToken
      }
    });
    
  } catch (error) {
    console.error('❌ Error en auth/google:', error);
    res.status(500).json({
      success: false,
      message: 'Error en autenticación con Google',
      error: error.message
    });
  }
});
```

## 🗺️ **Mapeo de campos:**

| Campo Google | Campo Backend | Valor por defecto |
|-------------|---------------|-------------------|
| `displayName` | `name` + `lastname` | Separado por espacios |
| `email` | `email` | ✅ Obligatorio |
| `uid` | `firebaseUid` | ✅ Obligatorio |
| `photoURL` | `profileImage` | URL o vacío |
| - | `phone` | `''` (vacío) |
| - | `role` | `'user'` |
| - | `sessionVersion` | `1` |

## 🚀 **Flujo completo:**

1. **Usuario hace login con Google** → Firebase Auth
2. **Frontend obtiene token** → `firebaseUser.getIdToken()`
3. **Frontend llama al backend** → `POST /api/v1/auth/google`
4. **Backend verifica token** → `admin.auth().verifyIdToken()`
5. **Backend busca usuario** → Base de datos local
6. **Si no existe** → Crear nuevo usuario automáticamente
7. **Si existe** → Login directo
8. **Backend responde** → Token JWT + datos usuario

## ✅ **Ventajas:**

- ✅ **Registro automático** - Sin formularios adicionales
- ✅ **Campos vacíos** - Se llenan con valores por defecto
- ✅ **Accesible para todos** - Cualquier usuario de Google puede usar la app
- ✅ **Sin duplicados** - Verifica por email y firebaseUid
- ✅ **Seguro** - Verifica token de Firebase

## 🔧 **Para implementar:**

1. Agregar el endpoint en tu backend
2. Instalar Firebase Admin SDK
3. Configurar las variables de entorno
4. Probar con el frontend

¡Listo! El registro automático funcionará inmediatamente. 🎉
