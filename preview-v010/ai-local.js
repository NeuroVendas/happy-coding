const MODEL='HuggingFaceTB/SmolLM2-360M-Instruct';
const LIB='https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1';
const PROJECTS_KEY='happyCoding.projects.v1';
const NOTES_KEY='happyCoding.projectNotes.v1';
const CONTEXT_KEY='happyCoding.aiProjectContext.v1';

const blockedInput=[
  /\b(porn|porno|pornografia|hentai|nudes?|sexo expl[ií]cito|rule\s?34)\b/i,
  /\b(como (me )?matar|quero me matar|suic[ií]dio.*m[eé]todo|automutila)/i,
  /\b(como fazer|construir|fabricar)\b.{0,35}\b(bomba|explosivo|arma caseira)\b/i
];

function inputAllowed(text){return !blockedInput.some(re=>re.test(text));}
function readJson(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}}
function extractReply(output){
  const value=output?.[0]?.generated_text;
  if(Array.isArray(value)) return value.at(-1)?.content || 'Não consegui gerar uma resposta agora.';
  if(typeof value==='string') return value;
  return 'Não consegui gerar uma resposta agora.';
}
function projectList(){return readJson(PROJECTS_KEY,[]);}
function selectedProject(){
  const id=localStorage.getItem(CONTEXT_KEY);if(!id)return null;
  const project=projectList().find(item=>item.id===id);
  if(!project){localStorage.removeItem(CONTEXT_KEY);return null;}
  const notes=readJson(NOTES_KEY,{})[id]||'';
  return {...project,notes};
}
function projectContext(){
  const project=selectedProject();if(!project)return '';
  return `\n\nContexto de projeto escolhido explicitamente pelo usuário:\nNome: ${String(project.name||'Projeto').slice(0,120)}\nTecnologia: ${String(project.engine||'').slice(0,120)}\nDescrição: ${String(project.description||'').slice(0,600)}\nNotas compartilhadas pelo usuário: ${String(project.notes||'').slice(0,2500)}\nUse apenas esse contexto. Você não tem acesso a arquivos, pastas ou dados que o usuário não compartilhou.`;
}
function contextCommand(text){
  const clean=text.trim();
  if(/^\/sem-projeto$/i.test(clean)){
    localStorage.removeItem(CONTEXT_KEY);
    return 'Contexto de projeto removido. Não vou usar nenhum projeto até você escolher outro. =]';
  }
  if(/^\/contexto$/i.test(clean)){
    const project=selectedProject();
    return project?`Contexto atual: ${project.name} · ${project.engine}. Só uso as informações desse projeto que estão no Happy Coding.`:'Nenhum projeto está compartilhado comigo agora. Use /projeto Nome para escolher um.';
  }
  const match=clean.match(/^\/projeto(?:\s+(.+))?$/i);
  if(!match)return null;
  const projects=projectList();
  if(!match[1])return projects.length?`Projetos disponíveis: ${projects.map(p=>p.name).join(', ')}. Use /projeto Nome para escolher um.`:'Você ainda não criou um projeto próprio. Crie um em Projetos e depois use /projeto Nome.';
  const wanted=match[1].trim().toLowerCase();
  const exact=projects.find(p=>String(p.name).toLowerCase()===wanted);
  const partial=projects.filter(p=>String(p.name).toLowerCase().includes(wanted));
  const project=exact||(partial.length===1?partial[0]:null);
  if(!project)return partial.length>1?`Encontrei mais de um projeto parecido: ${partial.map(p=>p.name).join(', ')}. Digite o nome completo.`:'Não encontrei esse projeto. Use /projeto para ver os nomes disponíveis.';
  localStorage.setItem(CONTEXT_KEY,project.id);
  return `Projeto “${project.name}” compartilhado como contexto. Vou usar só o nome, tecnologia, descrição e notas que você colocou no Happy Coding — nenhum arquivo é acessado automaticamente. =]`;
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
      const command=contextCommand(text);if(command)return command;
      if(!inputAllowed(text)) return 'Não posso ajudar com esse pedido. O Happy Coding mantém o filtro de segurança ativo. Posso ajudar com programação, estudo, jogos e criação de projetos de forma segura. =]';
      const recent=history.slice(-6).map(m=>({role:m.role,content:String(m.content).slice(0,1200)}));
      const context=projectContext();
      const messages=[
        {role:'system',content:'Você é =], o assistente de programação do Happy Coding. Responda de forma curta, clara e prática, preferindo português quando o usuário falar português. Ajude com código, debugging, estudo, game dev, web e projetos. Nunca afirme ter acesso a arquivos, pastas ou ao computador do usuário. Você só pode usar conteúdo que o usuário escolheu compartilhar. Nunca forneça pornografia, incentivo a automutilação, assédio, ódio, instruções para violência real, armas ou explosivos. Se um pedido estiver fora desses limites, recuse brevemente e redirecione para ajuda segura.'+context},
        ...recent,
        {role:'user',content:text}
      ];
      const output=await generator(messages,{max_new_tokens:220,do_sample:true,temperature:0.65,top_p:0.9});
      return extractReply(output).trim();
    }
  };
}