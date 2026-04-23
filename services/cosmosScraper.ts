/**
 * Cosmos Bluesoft Web Scraper Service
 * Extrai dados diretamente do HTML do site para evitar uso de API Keys.
 */

export interface ScrapedProduct {
  name: string;
  image_url: string | null;
}

export async function scrapeCosmos(barcode: string): Promise<ScrapedProduct | null> {
  const url = `https://cosmos.bluesoft.com.br/produtos/${barcode}`;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 segundos de timeout

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 404) {
      console.log(`[Scraper] Produto ${barcode} não encontrado no Cosmos (404).`);
      return null;
    }

    if (!response.ok) {
      console.log(`[Scraper] Erro HTTP no Cosmos: ${response.status}`);
      return null;
    }

    const html = await response.text();

    // 1. Extrair Nome (Procura dentro do h1 com classe page-header)
    // Exemplo: <h1 class="page-header"> NOME DO PRODUTO </h1>
    const nameMatch = html.match(/<h1[^>]*class=["']page-header["'][^>]*>([\s\S]*?)<\/h1>/i);
    let name = nameMatch ? nameMatch[1].trim() : null;

    // Se falhar, tenta o fallback pelo título da página
    if (!name) {
      const titleMatch = html.match(/<title>([\s\S]*?)- Cosmos<\/title>/i);
      name = titleMatch ? titleMatch[1].trim() : null;
    }

    // 2. Extrair Imagem (Procura a imagem principal do produto)
    // Exemplo: <img class="product-image" src="https://..." />
    const imgMatch = html.match(/<img[^>]*class=["']product-image["'][^>]*src=["']([^"']+)["']/i);
    const imageUrl = imgMatch ? imgMatch[1] : null;

    if (name && name !== "Produtos") {
      return {
        name,
        image_url: imageUrl,
      };
    }

    return null;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log('[Scraper] Tempo esgotado (Timeout) ao consultar Cosmos.');
    } else {
      console.error('[Scraper] Erro ao raspar Cosmos:', error.message);
    }
    return null;
  }
}

/**
 * BÔNUS: Barcode Monster (API Gratuita via Scraping/JSON)
 * Outra fonte excelente que não requer chave.
 */
export async function scrapeBarcodeMonster(barcode: string): Promise<ScrapedProduct | null> {
  const url = `https://barcodemonster.com/api/v1/products/${barcode}`;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const json = await response.json();
    
    if (json && json.name) {
      return {
        name: json.name,
        image_url: json.image_url || null,
      };
    }
    return null;
  } catch {
    return null;
  }
}
