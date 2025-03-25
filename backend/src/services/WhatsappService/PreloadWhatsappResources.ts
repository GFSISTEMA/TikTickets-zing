import puppeteer from "puppeteer";
import path from "path";
import fs from "fs";
import { logger } from "../../utils/logger";

// Pré-carrega recursos do WhatsApp Web para acelerar a autenticação
export const preloadWhatsappResources = async (): Promise<void> => {
  logger.info("Iniciando pré-carregamento de recursos do WhatsApp Web");
  
  try {
    // Assegura que o diretório de cache existe
    const cacheDir = path.join(__dirname, "../../../.wwebjs_cache");
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
      logger.info(`Diretório de cache criado: ${cacheDir}`);
    }

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-extensions",
        "--disable-application-cache",
        "--aggressive-cache-discard",
        "--disable-features=site-per-process",
        "--js-flags=--expose-gc",
        "--disable-web-security",
        "--single-process",
        "--enable-features=NetworkService"
      ]
    });
    
    const page = await browser.newPage();
    
    // Define um User-Agent para evitar detecção de bot
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");
    
    // Otimiza configurações de cache
    await page.setCacheEnabled(true);
    
    // Carrega o WhatsApp Web para preencher o cache
    logger.info("Carregando WhatsApp Web para pré-carregar recursos...");
    await page.goto("https://web.whatsapp.com/", { 
      waitUntil: "networkidle2",
      timeout: 60000 // 1 minuto de timeout
    });
    
    // Aguarda alguns segundos para carregar recursos críticos
    logger.info("Aguardando carregamento de recursos críticos...");
    await new Promise(resolve => setTimeout(resolve, 8000));
    
    // Coleta métricas de performance
    const performanceMetrics = await page.metrics();
    logger.info(`Métricas de performance do pré-carregamento: 
      - Tempo de script: ${performanceMetrics.ScriptDuration}ms
      - Uso de memória: ${Math.round((performanceMetrics.JSHeapUsedSize || 0) / 1024 / 1024)}MB
      - Documentos: ${performanceMetrics.Documents}
      - Frames: ${performanceMetrics.Frames}
    `);
    
    // Fecha o navegador
    await browser.close();
    logger.info("Pré-carregamento de recursos do WhatsApp Web concluído com sucesso");
  } catch (error) {
    logger.error(`Erro no pré-carregamento de recursos do WhatsApp Web: ${error}`);
  }
};
