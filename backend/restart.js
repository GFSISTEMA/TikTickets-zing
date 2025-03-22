const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Reiniciando servidor backend...');

// Executa o script para reiniciar o serviço
exec('node dist/server.js', (error, stdout, stderr) => {
  if (error) {
    console.error(`Erro ao executar: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`Stderr: ${stderr}`);
    return;
  }
  console.log(`Stdout: ${stdout}`);
});

console.log('Comando de reinicialização enviado!'); 