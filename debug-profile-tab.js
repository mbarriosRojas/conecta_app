// Script para debuggear el problema del tab de perfil
console.log('🔍 DEBUGGING PROFILE TAB');

// Verificar si estamos en la página correcta
console.log('📍 Current URL:', window.location.href);
console.log('📍 Current path:', window.location.pathname);

// Verificar si el router está funcionando
if (window.ng && window.ng.getComponent) {
  console.log('✅ Angular está disponible');
} else {
  console.log('❌ Angular no está disponible');
}

// Verificar si hay errores en la consola
console.log('🔍 Verificando errores...');

// Función para probar el click en el tab
function testProfileTabClick() {
  console.log('🧪 Probando click en tab de perfil...');
  
  // Buscar el tab de perfil
  const profileTab = document.querySelector('ion-tab-button[tab="tab3"]');
  if (profileTab) {
    console.log('✅ Tab de perfil encontrado:', profileTab);
    
    // Simular click
    profileTab.click();
    console.log('🖱️ Click simulado en tab de perfil');
    
    // Verificar si cambió la URL después de un delay
    setTimeout(() => {
      console.log('📍 URL después del click:', window.location.href);
      console.log('📍 Path después del click:', window.location.pathname);
    }, 1000);
    
  } else {
    console.log('❌ Tab de perfil NO encontrado');
    
    // Listar todos los tabs disponibles
    const allTabs = document.querySelectorAll('ion-tab-button');
    console.log('📋 Tabs disponibles:', allTabs);
    allTabs.forEach((tab, index) => {
      console.log(`Tab ${index}:`, tab.getAttribute('tab'), tab.textContent);
    });
  }
}

// Ejecutar el test
testProfileTabClick();

console.log('✅ Debug script ejecutado');
