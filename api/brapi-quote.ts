import type { VercelRequest, VercelResponse } from '@vercel/node';

// Função de servidor (Vercel) — mantém o BRAPI_TOKEN fora do frontend e do repositório.
// O cliente chama /api/brapi-quote?symbols=... sem nenhuma credencial; esta função é a
// única que fala com a brapi.dev, usando o token lido de process.env.BRAPI_TOKEN.

interface CotacaoAtivo {
  regularMarketPrice: number;
  shortName?: string;
  currency?: string;
  regularMarketTime?: string;
}

interface BrapiQuoteResult {
  requestedSymbol: string;
  symbol: string;
  data: CotacaoAtivo;
}

interface BrapiQuoteResponse {
  results: BrapiQuoteResult[];
  requestedAt: string;
  took: string;
}

interface ErroResposta {
  codigo: string;
  mensagem: string;
}

async function buscarCotacaoBrapi(symbols: string[], token: string): Promise<BrapiQuoteResult[]> {
  const url = `https://brapi.dev/api/v2/stocks/quote?symbols=${symbols.map(encodeURIComponent).join(',')}`;
  const resposta = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!resposta.ok) {
    const corpo = await resposta.text().catch(() => '');
    throw new Error(`brapi_http_${resposta.status}:${corpo.slice(0, 300)}`);
  }

  const dados = (await resposta.json()) as BrapiQuoteResponse;
  return dados.results ?? [];
}

function statusParaErro(mensagem: string): number {
  if (mensagem.includes('brapi_http_401') || mensagem.includes('brapi_http_403')) return 401;
  if (mensagem.includes('brapi_http_429')) return 429;
  if (mensagem.includes('brapi_http_404')) return 404;
  return 502;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'GET') {
    const erro: ErroResposta = { codigo: 'metodo_nao_permitido', mensagem: 'Use GET.' };
    res.status(405).json(erro);
    return;
  }

  const token = process.env.BRAPI_TOKEN;
  if (!token) {
    const erro: ErroResposta = { codigo: 'token_nao_configurado', mensagem: 'BRAPI_TOKEN não configurado no servidor.' };
    res.status(500).json(erro);
    return;
  }

  const symbolsParam = req.query.symbols;
  const symbolsRaw = Array.isArray(symbolsParam) ? symbolsParam.join(',') : symbolsParam ?? '';
  const symbols = symbolsRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (!symbols.length) {
    const erro: ErroResposta = { codigo: 'symbols_obrigatorio', mensagem: 'Informe ?symbols=TICKER1,TICKER2' };
    res.status(400).json(erro);
    return;
  }

  try {
    const results = await buscarCotacaoBrapi(symbols, token);
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.status(200).json({ results });
  } catch (e) {
    const mensagem = e instanceof Error ? e.message : 'Erro desconhecido ao consultar a brapi.';
    const erro: ErroResposta = { codigo: 'brapi_falhou', mensagem };
    res.status(statusParaErro(mensagem)).json(erro);
  }
}
