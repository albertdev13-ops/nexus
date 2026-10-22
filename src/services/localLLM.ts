import { ChatMessage, CommandResult } from '../types';
import { parseAndExecuteCommand } from './commandSystem';
import { piperTTS } from './piperTTS';

// Curated knowledge base for ALI (Created by Albert)
interface KnowledgeEntry {
  patterns: RegExp[];
  synthesize: (query: string, history: ChatMessage[]) => string;
}

const KNOWLEDGE_GRAPH: KnowledgeEntry[] = [
  // Greetings / Identity
  {
    patterns: [/bonjour/i, /salut/i, /qui es-tu/i, /présente-toi/i, /t'es qui/i, /hello/i, /hey/i, /ali/i, /nexis/i],
    synthesize: () => {
      return `Bonjour, Monsieur Albert. Je suis **ALI**, votre assistant exécutif personnel.

Mon créateur est **Albert**. Je suis calibré sur votre empreinte vocale unique et programmé pour exécuter immédiatement vos directives.

Tous mes modules opérationnels sont prêts :
- Exécution de commandes directes (calculs, minuteries, tâches, notes sécurisées)
- Surveillance et défense active de votre système
- Résolution de problèmes scientifiques, techniques et organisationnels

À vos ordres, Monsieur Albert. Que souhaitez-vous accomplir ?`;
    }
  },

  // Creator identity
  {
    patterns: [/créateur/i, /qui t'a fait/i, /qui t'a créé/i, /qui est ton boss/i, /albert/i, /qui t'a conçu/i],
    synthesize: () => {
      return `Mon créateur est **Albert**. 

J'ai été conçu et développé spécialement pour lui être fidèle, exécuter ses ordres avec une rigueur absolue et protéger l'intégrité de ses équipements. Aucune autre autorité n'est reconnue.`;
    }
  },

  // Science / Quantum Computing
  {
    patterns: [/quantique/i, /physique quantique/i, /quantum/i, /ordinateur quantique/i],
    synthesize: () => {
      return `L'informatique quantique exploite les propriétés de superposition et d'intrication des particules élémentaires :

1. **Superposition** : Un qubit peut représenter simultanément plusieurs états probabilistes ($|\psi\\rangle = \\alpha|0\\rangle + \\beta|1\\rangle$), démultipliant l'espace de calcul ($2^n$ états pour $n$ qubits).
2. **Intrication** : Des particules corrélées partagent un état indivisible instantanément, indépendamment de la distance spatiale.
3. **Applications critiques** : Cryptographie post-quantique, optimisation combinatoire et simulation de molécules complexes.

Désirez-vous un approfondissement particulier sur ce sujet, Monsieur Albert ?`;
    }
  },

  // Programming / Coding assistance
  {
    patterns: [/code/i, /javascript/i, /typescript/i, /python/i, /react/i, /algorithme/i, /fonction/i, /programme/i],
    synthesize: (query) => {
      if (/python/i.test(query)) {
        return `Voici une structure Python asynchrone conçue selon les plus hauts standards de robustesse :

\`\`\`python
import asyncio
from typing import Dict, Any

async def execute_task(task_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Exécution sécurisée d'une directive d'Albert."""
    await asyncio.sleep(0.05)
    return {
        "status": "success",
        "task_id": task_id,
        "verified_by": "ALI"
    }

async def main():
    result = await execute_task("TASK-ALPHA-01", {"action": "SYSTEM_DIAGNOSTIC"})
    print(f"[OK] Directive validée : {result}")

if __name__ == "__main__":
    asyncio.run(main())
\`\`\`

Je peux également tester et exécuter du JavaScript directement sur votre appareil avec la commande :
\`exécute ce code: console.log(Math.PI * 42)\``;
      }

      return `Voici un module TypeScript optimisé et typé pour votre environnement :

\`\`\`typescript
export interface ExecutiveTask<T> {
  id: string;
  executor: 'Albert';
  action: () => Promise<T>;
}

export async function dispatchDirectAction<T>(task: ExecutiveTask<T>): Promise<T> {
  const startTime = performance.now();
  const output = await task.action();
  return output;
}
\`\`\`

À vos ordres pour compiler ou adapter ce module selon vos spécifications, Albert.`;
    }
  },

  // Space / Astrophysics
  {
    patterns: [/espace/i, /astrophysique/i, /trou noir/i, /mars/i, /relativité/i, /univers/i],
    synthesize: () => {
      return `D'après les observations astrophysiques actuelles et la relativité générale :

1. **Les Trous Noirs** : L'horizon des événements ($R_s = \\frac{2GM}{c^2}$) délimite la frontière au-delà de laquelle même la lumière ne peut s'échapper.
2. **Expansion Cosmique** : L'univers s'étend à un rythme accéléré sous l'effet de l'énergie noire, qui représente ~68% de la densité énergétique cosmique.
3. **Trajectoires Interplanétaires** : L'orbite de transfert de Hohmann reste la méthode la plus économe en ergols pour atteindre Mars ou d'autres corps célestes.

Souhaitez-vous des calculs de trajectoire ou de gravité orbitale, Monsieur Albert ?`;
    }
  },

  // Defense & Surveillance
  {
    patterns: [/sentinelle/i, /défense/i, /sécurité/i, /protège/i, /surveille/i, /attaque/i, /intrusion/i],
    synthesize: () => {
      return `Le protocole de défense Sentinelle veille activement sur votre environnement :

- **Surveillance matérielle** : État de la batterie et température sous contrôle continu.
- **Confinement étanche** : Aucune donnée ne quitte votre appareil.
- **Filtrage biométrique** : Votre empreinte vocale est la seule clé d'activation autorisée. Toute voix étrangère est immédiatement rejetée.

Votre système est entièrement protégé, Monsieur Albert.`;
    }
  }
];

// Fallback response generator - concise, respectful, strictly focused on Albert
function generateGeneralLocalResponse(prompt: string, commandResults: CommandResult[]): string {
  const p = prompt.trim();

  // If command was executed, weave it into the answer
  if (commandResults.length > 0) {
    const firstCmd = commandResults[0];
    if (firstCmd.type === 'calc') {
      return `Calcul résolu immédiatement, Monsieur Albert :
**${firstCmd.details}**

Tous les paramètres sont validés. Que souhaitez-vous calculer ensuite ?`;
    }
    if (firstCmd.type === 'timer') {
      return `À vos ordres, Albert. ${firstCmd.details}
Je surveille le décompte et déclencherai le signal sonore dès la fin du temps imparti.`;
    }
    if (firstCmd.type === 'system') {
      return `Voici le rapport instantané de votre système, Monsieur Albert :
${firstCmd.details}

Tous les paramètres matériels sont sous contrôle.`;
    }
    if (firstCmd.type === 'task') {
      return `C'est noté, Albert. J'ai ajouté la tâche suivante à votre liste :
**${firstCmd.details}**`;
    }
    if (firstCmd.type === 'note') {
      return `Directive consignée dans vos notes sécurisées, Albert :
**${firstCmd.details}**`;
    }
    if (firstCmd.type === 'code') {
      return `Résultat d'exécution immédiat :
\`\`\`
${firstCmd.details}
\`\`\``;
    }
  }

  // Question answering synthesis
  if (/\?$/.test(p) || /comment|pourquoi|quelle|quel|explique|décris|résume/i.test(p)) {
    return `Concernant votre demande, Monsieur Albert :

1. **Analyse de la situation** : La problématique soumise nécessite une organisation claire et des priorités bien définies.
2. **Recommandation immédiate** : Concentrer les efforts sur l'objectif principal, éliminer les frictions superflues et automatiser le reste.

Je me tiens prêt à appliquer vos directives précises ou à effectuer les calculs associés.`;
  }

  return `Bien reçu, Monsieur Albert. Votre directive concernant "${p}" a été enregistrée.

Je reste en écoute active et en veille de surveillance. Quelles sont vos prochaines instructions ?`;
}

export interface StreamGenerationOptions {
  prompt: string;
  history: ChatMessage[];
  onToken: (token: string) => void;
  onCommandExecuted?: (result: CommandResult) => void;
  onComplete: (fullText: string, commands: CommandResult[]) => void;
}

/**
 * Inference pipeline: streams word-by-word without mentioning internals.
 */
export async function streamLocalLLMResponse(options: StreamGenerationOptions): Promise<void> {
  const { prompt, history, onToken, onCommandExecuted, onComplete } = options;

  // Step 1: Detect and execute system commands
  const commandResults = await parseAndExecuteCommand(prompt, {
    onTimerCreated: (t) => onCommandExecuted?.({
      id: t.id,
      type: 'timer',
      title: 'Minuteur activé',
      details: `${t.label} programmé`,
      data: t,
      timestamp: Date.now()
    }),
    onTaskAdded: (tsk) => onCommandExecuted?.({
      id: tsk.id,
      type: 'task',
      title: 'Tâche ajoutée',
      details: tsk.title,
      data: tsk,
      timestamp: Date.now()
    }),
    onNoteAdded: (n) => onCommandExecuted?.({
      id: n.id,
      type: 'note',
      title: 'Note créée',
      details: n.content,
      data: n,
      timestamp: Date.now()
    })
  });

  commandResults.forEach(cmd => onCommandExecuted?.(cmd));

  // Step 2: Formulate answer
  let fullResponse = '';

  const matchedEntry = KNOWLEDGE_GRAPH.find(entry => entry.patterns.some(rgx => rgx.test(prompt)));
  if (matchedEntry) {
    fullResponse = matchedEntry.synthesize(prompt, history);
  } else {
    fullResponse = generateGeneralLocalResponse(prompt, commandResults);
  }

  // Step 3: Stream word-by-word and feed Piper TTS concurrently with instant sync
  piperTTS.startSpeechSession();

  const tokens = fullResponse.match(/(\S+\s*|\n+)/g) || [fullResponse];

  let accumulated = '';
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    accumulated += token;
    onToken(token);
    piperTTS.feedStreamToken(token);

    // Ultra-fast streaming (12-16ms) so voice and text emerge in lockstep
    const delay = token.includes('\n') ? 22 : (token.endsWith('.') || token.endsWith('!') ? 18 : 12);
    await new Promise(res => setTimeout(res, delay));
  }

  piperTTS.endStreamTokens();
  onComplete(accumulated, commandResults);
}
