import * as vscode from 'vscode';

type Translations = {
	[key: string]: {
		[lang: string]: string;
	};
};

const translations: Translations = {
	// Messages
	'noWorkspace': {
		'es': 'No hay carpeta de workspace abierta',
		'en': 'No workspace folder is open',
		'fr': 'Aucun dossier de workspace ouvert',
		'de': 'Kein Workspace-Ordner geöffnet',
		'pt': 'Nenhuma pasta de workspace aberta',
		'it': 'Nessuna cartella workspace aperta'
	},
	'noScripts': {
		'es': 'No se encontraron scripts en package.json',
		'en': 'No scripts found in package.json',
		'fr': 'Aucun script trouvé dans package.json',
		'de': 'Keine Skripte in package.json gefunden',
		'pt': 'Nenhum script encontrado em package.json',
		'it': 'Nessuno script trovato in package.json'
	},
	'selectScript': {
		'es': 'Selecciona un script para ejecutar',
		'en': 'Select a script to run',
		'fr': 'Sélectionnez un script à exécuter',
		'de': 'Wähle ein Skript zum Ausführen',
		'pt': 'Selecione um script para executar',
		'it': 'Seleziona uno script da eseguire'
	},
	'executing': {
		'es': 'Ejecutando',
		'en': 'Executing',
		'fr': 'Exécution',
		'de': 'Ausführung',
		'pt': 'Executando',
		'it': 'Esecuzione'
	},
	'processCompleted': {
		'es': 'Proceso completado con código',
		'en': 'Process completed with code',
		'fr': 'Processus terminé avec le code',
		'de': 'Prozess abgeschlossen mit Code',
		'pt': 'Processo concluído com código',
		'it': 'Processo completato con codice'
	},
	'processTerminated': {
		'es': 'Proceso terminó con código',
		'en': 'Process terminated with code',
		'fr': 'Processus terminé avec le code',
		'de': 'Prozess beendet mit Code',
		'pt': 'Processo terminado com código',
		'it': 'Processo terminato con codice'
	},
	'processStopped': {
		'es': 'Proceso detenido por el usuario',
		'en': 'Process stopped by user',
		'fr': 'Processus arrêté par l\'utilisateur',
		'de': 'Prozess vom Benutzer gestoppt',
		'pt': 'Processo interrompido pelo usuário',
		'it': 'Processo interrotto dall\'utente'
	},
	'error': {
		'es': 'Error',
		'en': 'Error',
		'fr': 'Erreur',
		'de': 'Fehler',
		'pt': 'Erro',
		'it': 'Errore'
	},
	'confirmClearHistory': {
		'es': '¿Estás seguro de que quieres eliminar todo el historial?',
		'en': 'Are you sure you want to clear all history?',
		'fr': 'Êtes-vous sûr de vouloir effacer tout l\'historique?',
		'de': 'Möchten Sie wirklich den gesamten Verlauf löschen?',
		'pt': 'Tem certeza de que deseja limpar todo o histórico?',
		'it': 'Sei sicuro di voler cancellare tutta la cronologia?'
	},
	'confirmRemoveItem': {
		'es': '¿Estás seguro de que quieres eliminar este registro del historial?',
		'en': 'Are you sure you want to remove this item from history?',
		'fr': 'Êtes-vous sûr de vouloir supprimer cet élément de l\'historique?',
		'de': 'Möchten Sie dieses Element wirklich aus dem Verlauf entfernen?',
		'pt': 'Tem certeza de que deseja remover este item do histórico?',
		'it': 'Sei sicuro di voler rimuovere questo elemento dalla cronologia?'
	},
	'historyCleared': {
		'es': 'Historial limpiado',
		'en': 'History cleared',
		'fr': 'Historique effacé',
		'de': 'Verlauf gelöscht',
		'pt': 'Histórico limpo',
		'it': 'Cronologia cancellata'
	},
	'yes': {
		'es': 'Sí',
		'en': 'Yes',
		'fr': 'Oui',
		'de': 'Ja',
		'pt': 'Sim',
		'it': 'Sì'
	},
	'no': {
		'es': 'No',
		'en': 'No',
		'fr': 'Non',
		'de': 'Nein',
		'pt': 'Não',
		'it': 'No'
	},
	'running': {
		'es': 'En ejecución',
		'en': 'Running',
		'fr': 'En cours',
		'de': 'Läuft',
		'pt': 'Executando',
		'it': 'In esecuzione'
	},
	'completed': {
		'es': 'Completado',
		'en': 'Completed',
		'fr': 'Terminé',
		'de': 'Abgeschlossen',
		'pt': 'Concluído',
		'it': 'Completato'
	},
	'failed': {
		'es': 'Fallido',
		'en': 'Failed',
		'fr': 'Échoué',
		'de': 'Fehlgeschlagen',
		'pt': 'Falhou',
		'it': 'Fallito'
	},
	'enterInput': {
		'es': 'Introduce texto...',
		'en': 'Enter input...',
		'fr': 'Entrez du texte...',
		'de': 'Eingabe eingeben...',
		'pt': 'Digite texto...',
		'it': 'Inserisci testo...'
	},
	'stop': {
		'es': 'Detener',
		'en': 'Stop',
		'fr': 'Arrêter',
		'de': 'Stoppen',
		'pt': 'Parar',
		'it': 'Ferma'
	},
	'clear': {
		'es': 'Limpiar',
		'en': 'Clear',
		'fr': 'Effacer',
		'de': 'Löschen',
		'pt': 'Limpar',
		'it': 'Cancella'
	}
};

function getLanguage(): string {
	const vscodeLang = vscode.env.language;
	// Extract base language (e.g., 'es' from 'es-ES')
	const baseLang = vscodeLang.split('-')[0];
	return baseLang;
}

export function t(key: string): string {
	const lang = getLanguage();
	const translation = translations[key];
	
	if (!translation) {
		console.warn(`Translation key not found: ${key}`);
		return key;
	}
	
	// Try to get translation for current language, fallback to English, then key
	return translation[lang] || translation['en'] || key;
}
