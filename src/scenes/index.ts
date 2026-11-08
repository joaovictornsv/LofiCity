import type { CityId } from '../sky/cities';
import { acudeVelho } from './acude-velho';
import { armazemParaiba } from './armazem-paraiba';
import { caboBranco } from './cabo-branco';
import { centroAreia } from './centro-areia';
import { lagoaRemigio } from './lagoa-remigio';
import { campoRodoviaria } from './campo-rodoviaria';
import { capelinha } from './capelinha';
import { centroTeatro } from './centro-teatro';
import { estacaoVelha } from './estacao-velha';
import { konbini } from './konbini';
import { neonAlley } from './neon-alley';
import { parqueCrianca } from './parque-da-crianca';
import { partage } from './partage-shopping';
import { piramide } from './piramide-parque-do-povo';
import { pracaCultura } from './praca-cultura';
import { praca } from './praca-matriz';
import { rainCorner } from './rain-corner';
import { ruaComercio } from './rua-comercio';
import { ruaFaustino } from './rua-faustino';
import { ruaJoseBezerra } from './rua-jose-bezerra';
import { shrine } from './shrine';
import { terminalIntegracao } from './terminal-integracao';
import type { Scene } from './types';

export const SCENES: Record<CityId, Scene[]> = {
  tokyo: [rainCorner, neonAlley, konbini, shrine],
  esperanca: [praca, ruaComercio, capelinha, pracaCultura, campoRodoviaria, centroTeatro, armazemParaiba, ruaFaustino, ruaJoseBezerra],
  campina: [acudeVelho, piramide, estacaoVelha, parqueCrianca, partage, terminalIntegracao],
  joaopessoa: [caboBranco],
  areia: [centroAreia],
  remigio: [lagoaRemigio],
};

const LAST_KEY = 'loficity:lastScene:';

/** #scene=<id> pins a scene; otherwise every load picks a random one, never the previous. */
export function pickScene(city: CityId): Scene {
  const list = SCENES[city];
  const want = /scene=([\w-]+)/.exec(location.hash)?.[1];
  const pinned = list.find((s) => s.id === want);
  if (pinned) return pinned;
  let last: string | null = null;
  try { last = localStorage.getItem(LAST_KEY + city); } catch { /* storage unavailable */ }
  const pool = list.length > 1 ? list.filter((s) => s.id !== last) : list;
  const scene = pool[Math.floor(Math.random() * pool.length)];
  try { localStorage.setItem(LAST_KEY + city, scene.id); } catch { /* storage unavailable */ }
  return scene;
}

export function nextScene(city: CityId, current: Scene): Scene {
  const list = SCENES[city];
  return list[(list.indexOf(current) + 1) % list.length];
}
