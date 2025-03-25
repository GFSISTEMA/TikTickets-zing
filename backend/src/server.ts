import __init from "./app";
import { logger } from "./utils/logger";
import scheduleClosePendingTicketsJob from "./jobs/ClosePendingTicketsJob";
import { scheduleConnectionVerification } from "./services/WbotServices/VerifyConnectionService";
import { 
  cleanupAllSessions,
  killChromiumProcesses 
} from "./services/WbotServices/SessionCleanupService";
import path from "path";
import fs from "fs";

// Função para limpar recursos antes de iniciar o servidor
const limparRecursosAntigos = async (): Promise<void> => {
  try {
    logger.info("Limpando recursos antigos antes de iniciar...");
    
    // Usa os serviços centralizados para limpeza completa
    // Primeiro, mata processos chrome abandonados
    await killChromiumProcesses();
    
    // Em seguida, limpa todas as sessões e arquivos de bloqueio
    // Esta função agora contém toda a lógica de limpeza de arquivos
    await cleanupAllSessions();
    
    logger.info("Limpeza de recursos concluída");
  } catch (error) {
    logger.error(`Erro durante limpeza de recursos: ${error}`);
  }
};

// Pré-carregamento do Chrome para melhorar o tempo de conexão inicial
try {
  // Importa de forma dinâmica para não bloquear o carregamento do servidor
  import("puppeteer").then(async puppeteer => {
    const minimalArgs = require('./libs/minimalArgs');
    
    console.log('Iniciando pré-carregamento de recursos do Chrome...');
    
    // Cria o diretório de cache se não existir
    const cacheDir = path.resolve(__dirname, "../.wwebjs_cache");
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
      console.log(`Diretório de cache criado: ${cacheDir}`);
    }
    
    // Argumentos otimizados para o browser
    const preloadArgs = [
      ...minimalArgs,
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--no-sandbox',
      '--disable-features=IsolateOrigins,site-per-process',
      '--aggressive-cache-discard',
      '--disable-application-cache',
      '--disk-cache-size=104857600', // 100MB de cache
    ];

    try {
      // Inicia o browser com configurações otimizadas
      const browser = await puppeteer.default.launch({
        args: [
          ...preloadArgs,
          '--ignore-certificate-errors'
        ],
        headless: true,
        timeout: 60000,
      });
      
      console.log('Browser iniciado para pré-carregamento');
      
      // Abre uma nova página e carrega o WhatsApp Web
      const page = await browser.newPage();
      
      // Configura timeouts mais curtos para pré-carregamento
      await page.setDefaultNavigationTimeout(30000);
      
      // Carrega o WhatsApp Web para preencher o cache
      console.log('Carregando WhatsApp Web para preenchimento de cache...');
      await page.goto('https://web.whatsapp.com/', { 
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      
      // Aguarda alguns segundos para os recursos serem carregados
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Fecha o browser
      await browser.close();
      console.log('Pré-carregamento de recursos do Chrome concluído com sucesso');
    } catch (error) {
      console.error(`Erro durante o pré-carregamento do Chrome: ${error}`);
    }
  }).catch(err => {
    console.log('Módulo puppeteer não disponível para pré-carregamento:', err.message);
  });
} catch (err) {
  console.log('Erro ao tentar pré-carregar recursos:', err.message);
}

// Inicializa a aplicação principal
__init().then(async (app: any) => {
  // Limpa recursos antigos antes de iniciar
  await limparRecursosAntigos();
  
  // Aguarda um pouco para garantir que todos os recursos foram liberados
  const startupDelay = 5000; // 5 segundos
  logger.info(`Aguardando ${startupDelay/1000} segundos para garantir que todos os recursos foram liberados...`);
  await new Promise(resolve => setTimeout(resolve, startupDelay));
  
  // Inicia o servidor da aplicação
  app.start();
  // Registra no log que o sistema foi iniciado
  logger.info("Started system!!");

  // Aguarda mais um pouco antes de iniciar os serviços WhatsApp
  const whatsappDelay = 3000; // 3 segundos
  await new Promise(resolve => setTimeout(resolve, whatsappDelay));
  logger.info("Iniciando serviços do WhatsApp...");

  // Inicia o job que fecha automaticamente tickets pendentes
  // Este job verifica periodicamente tickets que precisam ser fechados
  // baseado em regras de negócio como tempo de inatividade
  scheduleClosePendingTicketsJob();
  
  // Inicia o serviço de verificação de conexões WhatsApp
  // Este serviço verifica periodicamente se as conexões estão realmente ativas
  // e tenta reconectar automaticamente quando necessário
  scheduleConnectionVerification();
  logger.info("Serviço de verificação de conexões WhatsApp iniciado");
});
