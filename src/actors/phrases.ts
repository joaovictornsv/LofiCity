/* The authored pool of things people say when tapped (pt-BR with a Paraíba / Nordeste accent; simple
   pt-BR with a few Japanese words in Tokyo). Gentle on purpose: no slang that could hurt anyone, no
   alcohol, no politics. Pure data, chosen by ./speech-rules.ts.

   city:  'br' = any Paraíba city, or one city id. scene: only in that scene (implies its city).
   tod:   only at those times of day. wx: only when the REAL weather shows it (see weatherTags).
   who:   who may say it (default: an ordinary passer-by). The Capelinha has no passers-by, only its
          scripted visitors, the priest and the congregation, so its phrases name their roles; the
          players at the Campo da Rodoviária and in the Praça da Cultura kick-about speak as 'player',
          the volleyball players there as 'volley' and the school's students as 'student'. Inside the
          bus (src/scenes/onibus.ts) the passengers speak as 'rider', the children on the school bus as 'pupil'. */

export type Tod = 'manha' | 'tarde' | 'noite' | 'madrugada';
export type WxTag = 'heat' | 'cold' | 'rain' | 'snow';
export type Role = 'passerby' | 'visitor' | 'attendee' | 'priest' | 'player' | 'volley' | 'student' | 'rider' | 'pupil';
export interface Phrase { t: string; city?: string; scene?: string; tod?: Tod[]; wx?: WxTag; who?: Role[] }

type Opt = Omit<Phrase, 't'>;
const group = (o: Opt, ts: string[]): Phrase[] => ts.map((t) => ({ t, ...o }));
const BR = { city: 'br' }, TK = { city: 'tokyo' };
const DAY: Tod[] = ['manha', 'tarde'];
const OUT: Role[] = ['passerby', 'visitor'];

export const PHRASES: Phrase[] = [
  // ---------- anywhere in Paraíba ----------
  ...group(BR, [
    'Oi, tudo bom?', 'Oxente!', 'Eita, que susto!', 'Tudo massa?', 'Vixe, esqueci o que ia fazer…',
    'Tô só de passagem, visse?', 'Vai com Deus!', 'Bom te ver!', 'Já comeu hoje?', 'Vou ali e já volto.',
    'Arretado, né?', 'Tô aperreado, mas feliz.', 'Mainha mandou lembrança!', 'Eita, cadê minha chave?',
    'Paz e bem!', 'Sossego bom, né?',
  ]),
  ...group({ ...BR, tod: ['manha'] }, ['Bom dia, viu?', 'Bora um cafezinho?', 'Cuscuz com ovo e tô pronto!', 'Cedinho e já tô na rua.', 'Vou na padaria pegar pão.']),
  ...group({ ...BR, tod: ['tarde'] }, ['Boa tarde!', 'Tarde mansa, né?', 'Depois do almoço bate uma moleza…', 'Bora um picolé?']),
  ...group({ ...BR, tod: ['noite'] }, ['Boa noite, visse?', 'Indo pra casa jantar.', 'Noite bonita, né?', 'Bora uma tapioca?', 'Cansei, mas foi um dia bom.']),
  ...group({ ...BR, tod: ['madrugada'] }, ['Oxe, acordado essa hora?', 'Madrugada calminha…', 'Voltando do plantão.', 'Já já o galo canta.']),
  // weather: only with a real reading (or the #wx= test)
  ...group({ ...BR, wx: 'heat', who: OUT }, ['Vixe, que calor!', 'Tá quente que só!', 'Um geladinho agora caía bem.']),
  ...group({ ...BR, wx: 'heat', tod: DAY, who: OUT }, ['Esse sol tá de lascar!', 'Bora procurar uma sombra.']),
  ...group({ ...BR, wx: 'rain', who: OUT }, ['Chuvinha abençoada!', 'Eita, molhou tudo!', 'Cadê minha sombrinha?', 'Chuva boa pro roçado!']),
  ...group({ ...BR, wx: 'cold', who: OUT }, ['Friozinho bom, né?', 'Hoje pede um casaquinho.', 'Tempo bom pra um chá quente.']),

  // ---------- Esperança ----------
  ...group({ city: 'esperanca' }, ['Esperança é pequena, mas é arretada!', 'Daqui do Agreste, com carinho.']),
  ...group({ scene: 'praca-matriz' }, ['A Matriz tá linda hoje.', 'Vou acender uma vela na Matriz.', 'Já ouviu o sino da Matriz?', 'Me encontra aqui na praça!']),
  ...group({ scene: 'praca-matriz', tod: ['noite'] }, ['A Matriz iluminada é outra coisa.']),
  ...group({ scene: 'praca-cultura' }, ['Praça da Cultura é o point!', 'Bora sentar um pouco na praça?']),
  ...group({ scene: 'praca-cultura', tod: ['noite'] }, ['Será que hoje tem forró?']),
  ...group({ scene: 'praca-cultura', tod: DAY }, ['A meninada adora jogar bola aqui.', 'De tarde a praça vira quadra!']),
  // the school's students (weekday shifts, src/scenes/praca-cultura-schedule.ts) and the teenagers playing
  ...group({ scene: 'praca-cultura', who: ['student'] }, ['Hoje tem prova de matemática!', 'Esqueci o caderno em casa…', 'Cadê o pessoal da minha sala?', 'Fiz o dever de casa, ufa!', 'Tô de olho no recreio!', 'A merenda hoje tá boa, visse?']),
  ...group({ scene: 'praca-cultura', who: ['student'], tod: ['manha'] }, ['Que sono, acordei cedinho…', 'Bom dia, professora!']),
  ...group({ scene: 'praca-cultura', who: ['student'], tod: ['tarde'] }, ['Depois da aula tem vôlei na praça!']),
  ...group({ scene: 'praca-cultura', who: ['student'], wx: 'rain' }, ['Vixe, a mochila vai molhar!']),
  ...group({ scene: 'praca-cultura', who: ['student'], wx: 'heat' }, ['Calor danado pra estudar!']),
  ...group({ scene: 'praca-cultura', who: ['player'] }, ['Golzinho na praça é tradição!', 'Chuta, chuta!', 'Toca pra mim!', 'Vale gol de longe?', 'Quem perder sai!', 'A mochila é a trave, visse?']),
  ...group({ scene: 'praca-cultura', who: ['player'], wx: 'heat' }, ['Pausa pra água, galera!']),
  ...group({ scene: 'praca-cultura', who: ['volley'] }, ['Levanta, levanta!', 'Minha! Minha!', 'Saque viagem, hein?', 'Ponto nosso!', 'Bora mais um set?', 'Corta essa bola!']),
  ...group({ scene: 'praca-cultura', who: ['volley'], wx: 'heat' }, ['Que sol pra jogar vôlei!']),
  ...group({ scene: 'armazem-paraiba' }, ['Vou dar uma olhada no Armazém Paraíba.', 'Tem promoção no Armazém!', 'Comprei um liquidificador novo!']),
  ...group({ scene: 'rua-comercio' }, ['O comércio tá movimentado.', 'Vou ali na farmácia.', 'Achei um chinelo baratinho!']),
  ...group({ scene: 'campo-rodoviaria' }, ['Tem pelada no campo hoje?', 'Vou pegar o ônibus pra Campina.', 'Bora uma resenha?']),
  // the players on the pitch (src/scenes/campo-matches.ts): only football talk
  ...group({ scene: 'campo-rodoviaria', who: ['player'] }, ['Toca a bola!', 'Passa, passa!', 'Marca ele aí!', 'Bora, time!', 'Hoje a gente vira esse jogo!', 'Tô livre, tô livre!', 'Segura a defesa!', 'Que golaço seria…']),
  ...group({ scene: 'campo-rodoviaria', who: ['player'], tod: ['noite'] }, ['Com refletor ligado é outra coisa!', 'Último jogo da noite, bora!']),
  ...group({ scene: 'campo-rodoviaria', who: ['player'], wx: 'rain' }, ['Bola molhada corre demais!', 'Cuidado que o campo tá liso!']),
  ...group({ scene: 'campo-rodoviaria', who: ['player'], wx: 'heat' }, ['Vixe, que calor pra jogar bola!', 'Pede tempo pra beber água!']),
  ...group({ scene: 'centro-teatro' }, ['Bora dar uma volta no centro?', 'Vou encontrar os amigos ali.']),
  ...group({ scene: 'rua-faustino' }, ['Essa rua é tranquila, viu?', 'Vou visitar minha vó aqui perto.']),
  ...group({ scene: 'rua-jose-bezerra' }, ['Rua de vizinho bom é assim.', 'Tô indo levar um bolo pra vizinha.']),
  ...group({ scene: 'rua-manoel-rodrigues' }, ['Daqui dá pra ver a torre da Matriz!', 'Vou passar na farmácia rapidinho.', 'Deixei a moto ali no meio-fio.', 'Esse sinal lá na frente demora, viu?', 'Rua de comércio é outra coisa.']),
  ...group({ scene: 'rua-manoel-rodrigues', tod: ['manha'] }, ['Cedinho e o comércio já tá abrindo.']),
  ...group({ scene: 'rua-manoel-rodrigues', tod: ['noite'] }, ['De noite a rua fica mais calminha.']),

  // ---------- Capelinha das Pedras: only its visitors, the priest and the congregation ----------
  ...group({ scene: 'capelinha', who: ['visitor'] }, ['Que vista lá de cima!', 'Vou tirar uma foto da Capelinha.', 'Essa capelinha é um encanto.', 'Subir até aqui valeu a pena!', 'Que pedra enorme, né?']),
  ...group({ scene: 'capelinha', who: ['visitor'], wx: 'rain' }, ['Cuidado, a pedra tá lisinha!']),
  ...group({ scene: 'capelinha', who: ['visitor'], wx: 'heat', tod: DAY }, ['Que sol em cima da pedra!']),
  ...group({ scene: 'capelinha', who: ['attendee'] }, ['Vim rezar um terço.', 'Amém!', 'A missa foi bonita.', 'Nossa Senhora nos guarde.', 'Paz e bem, irmão.']),
  ...group({ scene: 'capelinha', who: ['priest'] }, ['A paz do Senhor!', 'Fiquem com Deus.', 'Sejam bem-vindos à Capelinha.', 'Perpétuo Socorro, rogai por nós.']),

  // ---------- Campina Grande ----------
  ...group({ city: 'campina' }, ['Campina, Rainha da Borborema!', 'Já tô contando os dias pro São João!']),
  ...group({ scene: 'acude-velho' }, ['Bora caminhar no Açude Velho?', 'Que vista bonita do açude.']),
  ...group({ scene: 'acude-velho', tod: ['tarde'] }, ['O pôr do sol aqui é lindo.']),
  ...group({ scene: 'piramide-parque-do-povo' }, ['No São João isso aqui lota!', 'Que pirâmide arretada!', 'Bora um forrozinho?']),
  ...group({ scene: 'estacao-velha' }, ['Essa estação tem história, viu?', 'Já pensou o trem passando aqui?']),
  ...group({ scene: 'parque-da-crianca' }, ['Bora levar os meninos no parque?', 'Vou correr umas voltinhas.']),
  ...group({ scene: 'partage-shopping' }, ['Vou pegar um cineminha.', 'Bora tomar um açaí no shopping?']),
  ...group({ scene: 'partage-shopping', wx: 'heat' }, ['Ar-condicionado do shopping, que delícia!']),
  ...group({ scene: 'terminal-integracao' }, ['Será que o ônibus já passou?', 'Tô esperando o circular.', 'Ufa, achei um banquinho!']),

  // ---------- João Pessoa, Areia, Remígio ----------
  ...group({ city: 'joaopessoa' }, ['Que mar bonito!', 'Bora tomar uma água de coco?', 'Vou caminhar na orla.']),
  ...group({ city: 'joaopessoa', tod: ['manha'] }, ['Aqui o sol nasce primeiro!']),
  ...group({ city: 'joaopessoa', tod: ['noite'] }, ['Brisa do mar de noite é bom demais.']),
  ...group({ city: 'areia' }, ['Areia tem cada casarão lindo!', 'Bora comer uma rapadura?', 'Que ladeira, hein!']),
  ...group({ city: 'remigio' }, ['Remígio é puro sossego.']),
  ...group({ scene: 'lagoa-remigio' }, ['A lagoa tá bonita hoje.', 'Bora sentar na beira da lagoa?']),
  // the audience in the cinema (src/scenes/cinema-remigio.ts): only movie talk, whispered
  ...group({ scene: 'cinema-remigio', who: ['attendee'] }, [
    'Psiu! O filme já começou.', 'Passa a pipoca, visse?', 'Eita, que explosão!', 'Essa luta tá arretada!',
    'Fica até o fim, tem cena extra.', 'Quem é esse de capa verde?', 'Vixe, derrubou todo mundo!', 'Desliga o celular, por favor.',
  ]),

  // the street front of the cinema (src/scenes/cinema-fachada-remigio.ts): passers-by, the queue at
  // the door ('visitor', before a session) and the audience coming out ('attendee', after the film)
  ...group({ scene: 'cinema-fachada-remigio' }, ['Que fachada bonita a do cine!', 'Já viu os horários na placa?', 'Bora pegar uma sessão qualquer dia?']),
  ...group({ scene: 'cinema-fachada-remigio', tod: ['noite'] }, ['Cinema de noite tem outro clima.']),
  ...group({ scene: 'cinema-fachada-remigio', who: ['visitor'] }, ['Será que ainda tem lugar?', 'Bora, que já vai começar!', 'Vou pegar uma pipoca grande.', 'Tô na fila desde cedo, visse?']),
  ...group({ scene: 'cinema-fachada-remigio', who: ['attendee'] }, ['Que filme arretado!', 'Aquela explosão, hein?', 'Vou voltar pra ver de novo.', 'Gostei do final, viu?']),

  // ---------- inside the bus (src/scenes/onibus.ts): passengers and the children on the school bus ----------
  ...group({ ...BR, who: ['rider'] }, [
    'Motorista, desce na próxima!', 'Esse ônibus balança, visse?', 'Arrasta pra lá um tiquinho?', 'Vixe, esqueci de apertar o PARE!',
    'Alguém tem troco de dez?', 'Vou cochilar até o ponto final.', 'Segura firme, que ele freia!', 'Pode sentar aqui, tá livre.',
    'Esse motorista é bom de volante.',
  ]),
  ...group({ ...BR, who: ['rider'], tod: ['manha'] }, ['Bom dia, motorista!', 'Tô indo pro trabalho, visse?', 'Acordei cedinho pra pegar esse.']),
  ...group({ ...BR, who: ['rider'], tod: ['tarde'] }, ['Vou resolver umas coisas no centro.', 'Vou visitar minha tia.']),
  ...group({ ...BR, who: ['rider'], tod: ['noite'] }, ['Voltando do trabalho, cansado que só.', 'Ainda bem que peguei esse.']),
  ...group({ ...BR, who: ['rider'], wx: 'rain' }, ['Fecha a janela que tá chovendo!', 'Chuva lá fora e eu aqui sequinho.']),
  ...group({ ...BR, who: ['rider'], wx: 'heat' }, ['Abre a janela, por favor!', 'Que calor aqui dentro!']),
  ...group({ ...BR, who: ['rider'], wx: 'cold' }, ['Fecha essa janela, que tá frio!']),
  ...group({ city: 'campina', who: ['rider'] }, ['Desço no Açude Velho.', 'Vou pro Parque do Povo.', 'Desço no Terminal.']),
  ...group({ city: 'esperanca', who: ['rider'] }, ['Vou pra Campina resolver umas coisas.', 'Desço ali perto do mercado.']),
  ...group({ city: 'joaopessoa', who: ['rider'] }, ['Desço em Tambaú.', 'Vou pra orla.']),
  ...group({ city: 'areia', who: ['rider'] }, ['Desço lá em cima, na ladeira.', 'Vou pro centro histórico.']),
  ...group({ city: 'remigio', who: ['rider'] }, ['Desço perto da lagoa.', 'Vou pra Esperança e já volto.']),
  ...group({ ...BR, who: ['pupil'] }, ['Tia, já chegamos?', 'Hoje tem educação física!', 'Senta comigo!', 'Esqueci a merenda em casa…', 'Me empresta um lápis?', 'Quem vai no recreio comigo?']),
  ...group({ ...BR, who: ['pupil'], tod: ['tarde', 'noite'] }, ['Bora jogar bola depois da aula?']),

  // ---------- Tóquio (pt-BR simples, com um toque de japonês) ----------
  ...group(TK, ['Konnichiwa!', 'Arigatô!', 'Sumimasen, com licença!', 'Tóquio nunca dorme.', 'Vou pegar um onigiri.', 'Oi, tudo bem? Genki?']),
  ...group({ ...TK, tod: ['manha'] }, ['Ohayô! Bom dia!', 'Correndo pro trem!']),
  ...group({ ...TK, tod: ['tarde'] }, ['Hora do lanche!']),
  ...group({ ...TK, tod: ['noite'] }, ['Konbanwa! Boa noite.', 'Bora um lámen?', 'Otsukaresama! Dia longo.']),
  ...group({ ...TK, tod: ['madrugada'] }, ['Perdi o último trem…', 'Oyasumi… boa noite.']),
  ...group({ ...TK, wx: 'heat', who: OUT }, ['Atsui! Que calor!']),
  ...group({ ...TK, wx: 'cold', who: OUT }, ['Samui! Que frio!', 'Um chá quentinho agora…']),
  ...group({ ...TK, wx: 'rain', who: OUT }, ['Ame… chuva de novo!', 'Guarda-chuva sempre na bolsa.']),
  ...group({ ...TK, wx: 'snow', who: OUT }, ['Yuki! Tá nevando!']),
  ...group({ scene: 'neon-alley' }, ['Que neon bonito!', 'Esse beco tem cada lojinha…']),
  ...group({ scene: 'konbini' }, ['Irasshaimase! Bem-vindo!', 'Itadakimasu!', 'Konbini salva a vida.']),
  ...group({ scene: 'shrine' }, ['Vou fazer um pedido no santuário.', 'Que lugar tranquilo.']),
  ...group({ scene: 'rain-corner' }, ['Essa esquina tem um charme…', 'Vou esperar o sinal abrir.']),
];
