#!/usr/bin/env node

const io = require('socket.io-client');
const readline = require('readline');
const chalk = require('chalk');
const figlet = require('figlet');

class TerminalClient {
  constructor() {
    this.socket = null;
    this.rl = null;
    this.connected = false;
    this.commandHistory = [];
    this.historyIndex = -1;
    this.baseUrl = '';
    this.token = '';
  }

  // Mostrar el banner de bienvenida
  showBanner() {
    console.clear();
    console.log(chalk.red.bold(figlet.textSync('MayHost', { horizontalLayout: 'full' })));
    console.log(chalk.yellow('═══════════════════════════════════════════════════════════'));
    console.log(chalk.cyan('  Terminal Client - Hecho por SoyMaycol'));
    console.log(chalk.green('  Disponible 24/7 ♣'));
    console.log(chalk.yellow('═══════════════════════════════════════════════════════════\n'));
  }

  // Solicitar configuración inicial
  async getConfiguration() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      historySize: 100
    });

    return new Promise((resolve) => {
      this.rl.question(chalk.cyan('🌐 Ingresa la URL base del servidor (ej: http://localhost:3000): '), (url) => {
        this.baseUrl = url.trim();
        this.rl.question(chalk.cyan('🔑 Ingresa tu token: '), (token) => {
          this.token = token.trim();
          this.rl.close();
          resolve();
        });
      });
    });
  }

  // Conectar al servidor Socket.IO
  connectToServer() {
    console.log(chalk.yellow('🔄 Conectando al servidor...'));
    
    this.socket = io(this.baseUrl, {
      auth: { token: this.token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 10000
    });

    // Eventos del socket
    this.setupSocketEvents();
  }

  // Configurar eventos del socket
  setupSocketEvents() {
    this.socket.on('connect', () => {
      this.connected = true;
      console.log(chalk.green('✅ Conectado exitosamente al servidor'));
      console.log(chalk.cyan('💡 Escribe "help" para ver comandos disponibles'));
      console.log(chalk.cyan('💡 Escribe "exit" para salir del terminal'));
      console.log(chalk.yellow('═══════════════════════════════════════════════════════════\n'));
      this.startTerminal();
    });

    this.socket.on('disconnect', (reason) => {
      this.connected = false;
      console.log(chalk.red(`\n❌ Desconectado del servidor: ${reason}`));
      if (reason === 'io server disconnect') {
        console.log(chalk.yellow('🔄 Reconectando...'));
      }
    });

    this.socket.on('connect_error', (error) => {
      console.log(chalk.red(`❌ Error de conexión: ${error.message}`));
      if (error.message.includes('Authentication') || error.message.includes('Token')) {
        console.log(chalk.red('🔒 Error de autenticación. Verifica tu token.'));
        process.exit(1);
      }
    });

    this.socket.on('output', (data) => {
      if (data && data.trim()) {
        console.log(data);
      }
      this.showPrompt();
    });

    this.socket.on('session', (data) => {
      console.log(chalk.blue(`📋 Sesión: ${data.username} (${data.sessionId})`));
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(chalk.green(`✅ Reconectado después de ${attemptNumber} intentos`));
      this.connected = true;
    });

    this.socket.on('reconnect_error', (error) => {
      console.log(chalk.red(`❌ Error de reconexión: ${error.message}`));
    });

    this.socket.on('reconnect_failed', () => {
      console.log(chalk.red('❌ No se pudo reconectar al servidor'));
      process.exit(1);
    });
  }

  // Iniciar el terminal interactivo
  startTerminal() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.red.bold('MayHost ~$ '),
      historySize: 100
    });

    // Configurar navegación por historial
    this.rl.on('line', (input) => {
      const command = input.trim();
      this.handleCommand(command);
    });

    this.rl.on('close', () => {
      this.cleanup();
    });

    // Manejo de Ctrl+C
    this.rl.on('SIGINT', () => {
      console.log(chalk.yellow('\n👋 ¿Estás seguro de que quieres salir? (Ctrl+C de nuevo para confirmar)'));
      this.rl.prompt();
    });

    this.showPrompt();
  }

  // Manejar comandos
  handleCommand(command) {
    if (!command) {
      this.showPrompt();
      return;
    }

    // Agregar al historial
    if (this.commandHistory[this.commandHistory.length - 1] !== command) {
      this.commandHistory.push(command);
    }
    this.historyIndex = this.commandHistory.length;

    // Comandos locales
    if (this.handleLocalCommands(command)) {
      return;
    }

    // Enviar comando al servidor si está conectado
    if (this.connected && this.socket) {
      console.log(chalk.gray('⏳ Ejecutando comando...'));
      this.socket.emit('command', command);
    } else {
      console.log(chalk.red('❌ No hay conexión con el servidor'));
      this.showPrompt();
    }
  }

  // Manejar comandos locales
  handleLocalCommands(command) {
    switch (command.toLowerCase()) {
      case 'exit':
      case 'quit':
        console.log(chalk.yellow('👋 ¡Hasta luego!'));
        this.cleanup();
        return true;

      case 'clear':
        console.clear();
        this.showPrompt();
        return true;

      case 'help':
        this.showHelp();
        return true;

      case 'status':
        this.showStatus();
        return true;

      case 'soporte':
        console.log(chalk.cyan('📞 ¡Hola! Soy Maycol, Contactame por el numero 51921826291 por Whatsapp!'));
        this.showPrompt();
        return true;

      case '24/7':
        console.log(chalk.green('♣ Ese soy yo ♣'));
        this.showPrompt();
        return true;

      default:
        return false;
    }
  }

  // Mostrar ayuda
  showHelp() {
    console.log(chalk.cyan('\n📖 Comandos disponibles:'));
    console.log(chalk.white('  help     - Mostrar esta ayuda'));
    console.log(chalk.white('  clear    - Limpiar pantalla'));
    console.log(chalk.white('  status   - Mostrar estado de conexión'));
    console.log(chalk.white('  soporte  - Información de contacto'));
    console.log(chalk.white('  exit     - Salir del terminal'));
    console.log(chalk.white('  quit     - Salir del terminal'));
    console.log(chalk.yellow('\n💡 Cualquier otro comando será enviado al servidor remoto\n'));
    this.showPrompt();
  }

  // Mostrar estado
  showStatus() {
    console.log(chalk.cyan('\n📊 Estado del cliente:'));
    console.log(chalk.white(`  URL: ${this.baseUrl}`));
    console.log(chalk.white(`  Estado: ${this.connected ? chalk.green('Conectado') : chalk.red('Desconectado')}`));
    console.log(chalk.white(`  Socket ID: ${this.socket?.id || 'N/A'}`));
    console.log(chalk.white(`  Comandos en historial: ${this.commandHistory.length}\n`));
    this.showPrompt();
  }

  // Mostrar prompt
  showPrompt() {
    if (this.rl) {
      this.rl.prompt();
    }
  }

  // Limpiar recursos
  cleanup() {
    if (this.socket) {
      this.socket.disconnect();
    }
    if (this.rl) {
      this.rl.close();
    }
    process.exit(0);
  }

  // Iniciar la aplicación
  async start() {
    this.showBanner();
    await this.getConfiguration();
    this.connectToServer();
  }
}

// Manejar errores no capturados
process.on('uncaughtException', (error) => {
  console.log(chalk.red(`❌ Error no capturado: ${error.message}`));
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.log(chalk.red(`❌ Promesa rechazada: ${reason}`));
  process.exit(1);
});

// Iniciar la aplicación
if (require.main === module) {
  const client = new TerminalClient();
  client.start().catch(error => {
    console.error(chalk.red(`❌ Error al iniciar: ${error.message}`));
    process.exit(1);
  });
}

module.exports = TerminalClient;
