# 🔧 Fix del Registro - Campos Requeridos

## 🐛 **Problema identificado:**
El registro fallaba porque faltaba el campo `lastname` y había problemas con el campo `phone`.

## 📋 **Campos requeridos por el API:**
Según el backend (`userController.ts` y `user.ts`):

### **Campos obligatorios:**
- ✅ `name` (string, required: true)
- ✅ `email` (string, required: true, unique)
- ✅ `password` (string, required: true)

### **Campos opcionales pero manejados:**
- ✅ `lastname` (string, required: false)
- ✅ `phone` (string, required: false, pero si se proporciona debe tener ≥10 caracteres)

## 🔧 **Soluciones implementadas:**

### **1. Formulario de registro mejorado:**
```html
<!-- Nombre completo (solo en registro) -->
<div class="form-group" *ngIf="!isLogin" [@slideIn]>
  <ion-item class="custom-item">
    <ion-icon name="person-outline" slot="start" class="form-icon"></ion-icon>
    <ion-input 
      type="text"
      placeholder="Nombre completo"
      [(ngModel)]="formData.fullName"
      name="fullName"
      required>
    </ion-input>
  </ion-item>
</div>

<!-- Teléfono (solo en registro) -->
<div class="form-group" *ngIf="!isLogin" [@slideIn]>
  <ion-item class="custom-item">
    <ion-icon name="call-outline" slot="start" class="form-icon"></ion-icon>
    <ion-input 
      type="tel"
      placeholder="Teléfono (opcional)"
      [(ngModel)]="formData.phone"
      name="phone">
    </ion-input>
  </ion-item>
</div>
```

### **2. Interfaz FormData actualizada:**
```typescript
interface FormData {
  fullName?: string;
  phone?: string;        // ← NUEVO
  email: string;
  password: string;
  confirmPassword?: string;
}
```

### **3. Validaciones mejoradas en performRegister():**
```typescript
private async performRegister() {
  try {
    const nameParts = (this.formData.fullName || '').split(' ');
    const name = nameParts[0] || '';
    const lastname = nameParts.slice(1).join(' ') || '';
    
    // ✅ Validar que el nombre no esté vacío
    if (!name.trim()) {
      throw new Error('El nombre es requerido');
    }
    
    // ✅ Validar que el apellido no esté vacío
    if (!lastname.trim()) {
      throw new Error('El apellido es requerido');
    }
    
    // ✅ Validar teléfono si se proporciona
    const phone = this.formData.phone?.trim() || '';
    if (phone && phone.length < 10) {
      throw new Error('El número de teléfono debe tener al menos 10 caracteres');
    }
    
    const response = await this.authService.register({
      name,
      lastname,
      email: this.formData.email,
      password: this.formData.password,
      phone: phone || undefined // Enviar undefined si está vacío
    }).toPromise();
    
  } catch (error: any) {
    throw error;
  }
}
```

### **4. Método toggleMode() mejorado:**
```typescript
toggleMode() {
  this.isLogin = !this.isLogin;
  // Limpiar campos cuando cambie el modo
  this.formData = { 
    email: this.formData.email, 
    password: '', 
    phone: '',                    // ← NUEVO
    confirmPassword: '' 
  };
}
```

## ✅ **Flujo de registro corregido:**

### **Campos mostrados en registro:**
1. **Nombre completo** (requerido) → Se divide en `name` y `lastname`
2. **Teléfono** (opcional) → Validación de longitud si se proporciona
3. **Email** (requerido)
4. **Contraseña** (requerido)
5. **Confirmar contraseña** (requerido)

### **Validaciones aplicadas:**
- ✅ Nombre no puede estar vacío
- ✅ Apellido no puede estar vacío (se extrae del nombre completo)
- ✅ Teléfono debe tener ≥10 caracteres si se proporciona
- ✅ Email válido (validación del navegador)
- ✅ Contraseñas coinciden
- ✅ Contraseña ≥6 caracteres

### **Datos enviados al backend:**
```typescript
{
  name: "Juan",
  lastname: "Pérez García",
  email: "juan@email.com",
  password: "password123",
  phone: "1234567890" // o undefined si está vacío
}
```

## 🚀 **Para probar:**

1. **Ve al login** → Cambia a "Registrarse"
2. **Llena todos los campos** (teléfono es opcional)
3. **Haz clic en "Crear Cuenta"**
4. **Debería registrarse exitosamente** y redirigir al home

**¡El registro ahora debería funcionar correctamente!** 🎉
