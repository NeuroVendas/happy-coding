const MODEL='HuggingFaceTB/SmolLM2-360M-Instruct';
const LIB='https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1';

const blockedInput=[
  /\b(porn|porno|pornografia|hentai|nudes?|sexo expl[ií]cito|rule\s?34)\b/i,
  /\b(como (me )?matar|quero me matar|suic[ií]dio.*m[eé]todo|automutila)/i,
  /\b(como fazer|construir|fabricar)\b.{0,35}\b(bomba|explosivo|arma caseira)\b/i
];

function inputAllowed(text){return !blockedInput.some(re=>re.test(text));}
function extractReply(output){
  const value=output?.[0]?.generated_text;
  if(Array.isArray(value)) return value.at(-1)?.content || 'Não consegui gerar uma resposta agora.';
  if(typeof value==='string') return value;
  return 'Não consegui gerar uma resposta agora.';
}

export async function createLocalAssistant(onProgress=()=>{}){
  onProgress('Carregando biblioteca de IA…');
  const { pipeline } = await import(LIB);
  onProgress('Baixando o modelo na primeira execução…');
  const options={
    progress_callback(info){
      if(info?.status==='progress' && Number.isFinite(info.progress)) onProgress(`Baixando IA… ${Math.round(info.progress)}%`);
      else if(info?.status==='ready') onProgress('Modelo pronto.');
    }
  };
  if(navigator.gpu) options.device='webgpu';
  const generator=await pipeline('text-generation',MODEL,options);
  onProgress('IA local pronta =]');

  return {
    async ask(text, history=[]){
      if(!inputAllowed(text)) return 'Não posso ajudar com esse pedido. O Happy Coding mantém o filtro de segurança ativo. Posso ajudar com programação, estudo, jogos e criação de projetos de forma segura. =]';
      const recent=history.slice(-6).map(m=>({role:m.role,content:String(m.content).slice(0,1200)}));
      const messages=[
        {role:'system',content:'Você é =], o assistente de programação do Happy Coding. Responda de forma curta, clara e prática, preferindo português quando o usuário falar português. Ajude com código, debugging, estudo, game dev, web e projetos. Nunca forneça pornografia, incentivo a automutilação, assédio, ódio, instruções para violência real, armas ou explosivos. Se um pedido estiver fora desses limites, recuse brevemente e redirecione para ajuda segura.'},
        ...recent,
        {role:'user',content:text}
      ];
      const output=await generator(messages,{max_new_tokens:180,do_sample:true,temperature:0.65,top_p:0.9});
      return extractReply(output).trim();
    }
  };
}