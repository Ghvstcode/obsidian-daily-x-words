import { TFile, Plugin, MarkdownView, debounce, Debouncer, WorkspaceLeaf, addIcon, App, PluginSettingTab, Setting, Modal } from 'obsidian';
import { VIEW_TYPE_STATS_TRACKER } from './constants';
import StatsTrackerView from './view';

interface WordCount {
	initial: number;
	current: number;
}

interface XDailyWordsSettings {
	targetDailyWords: number;
	dayCounts: Record<string, number>;
	todaysWordCount: Record<string, WordCount>;
}

const DEFAULT_TARGET: number = 500

const DEFAULT_SETTINGS: XDailyWordsSettings = {
	targetDailyWords: DEFAULT_TARGET,
	dayCounts: {},
	todaysWordCount: {}
}

const prompts: string[] = [
	'Describe a moment when you felt really loved',
	'What was the most memorable vacation you ever took, and why?',
	'Tell the story of your first job',
	'Write about a challenging experience you faced and how you overcame it',
	'Describe a time when you helped someone and how it made you feel',
	'What is a place you would love to visit and why?',
	'Write about a time you achieved a goal and how it made you feel',
	'Who is a person who has greatly influenced you, and how have they impacted your life?',
	'What is a hobby that brings you joy and why?',
	'Write about a time when you were particularly proud of yourself',
	'Recall a moment when you were really happy',
	'Remember a time when you were really sad',
	'Describe a time when you were really angry',
	'Write about a time when you were really scared',
	'Remember a time when you were really excited',
	'Describe a time when you were really hopeful',
	'Write about a time when you were really hopeless',
	'Remember a time when you were really grateful',
	'Describe a time when you were really jealous',
	'Describe a moment when you felt really loved',
	'What was the most memorable vacation you ever took, and why?',
	'Tell the story of your first job',
	'Write about a challenging experience you faced and how you overcame it',
	'Describe a time when you helped someone and how it made you feel',
	'What is a place you would love to visit and why?',
	'Write about a time you achieved a goal and how it made you feel',
	'Who is a person who has greatly influenced you, and how have they impacted your life?',
	'What is a hobby that brings you joy and why?',
	'Write about a time when you were particularly proud of yourself',
	'Recall a moment when you were really happy',
	'Remember a time when you were really sad',
	'Describe a time when you were really angry',
	'Write about a time when you were really scared',
	'Remember a time when you were really excited',
	'Describe a time when you were really hopeful',
	'Write about a time when you were really hopeless',
	'Remember a time when you were really grateful',
	'Describe a time when you were really jealous',
	'Write about a time when you were really embarrassed',
	'Remember a time when you were really confused',
	'Describe a time when you were really proud of someone else',
	'Write about a time when you were really disappointed in someone else',
	'Recall a time when you were really surprised',
	'Remember a time when you were really curious',
	'Write about a time when you were really content',
	'Describe a time when you were really frustrated',
	'Write about a time when you were really overwhelmed',
	'Remember a time when you were really underwhelmed',
	'Write about a time when you felt really fulfilled',
	'Describe a time when you felt really incomplete',
	'Write about a time when you felt really alone',
	'Remember a time when you felt really connected to others',
	'Write about a time when you felt really appreciated',
	'Describe a time when you felt really undervalued',
	'Write about a time when you felt really misunderstood',
	'Remember a time when you felt really understood',
	'Write about a time when you felt really valued',
	'Describe a time when you felt really unimportant',
	'Write about a time when you felt really confident',
	'Remember a time when you felt really insecure',
	'Write about a time when you felt really empowered',
]  

function getSuggestion() {
	// Choose a random topic from the topics array
	const suggestion = prompts[Math.floor(Math.random() * prompts.length)];
	return suggestion;
  }
  
  // Get a suggestion for the user
  const suggestion = getSuggestion();

export default class XDailyWords extends Plugin {
	settings: XDailyWordsSettings;
	statusBarEl: HTMLElement;
	currentWordCount: number;
	today: string;
	debouncedUpdate: Debouncer<[contents: string, filepath: string]>;

	private view: StatsTrackerView;

	async onload() {
		await this.loadSettings();

		this.statusBarEl = this.addStatusBarItem();
		this.updateDate();
		if (this.settings.dayCounts.hasOwnProperty(this.today)) {
			this.updateCounts();
		} else {
			this.currentWordCount = 0;
		}

		this.debouncedUpdate = debounce((contents: string, filepath: string) => {
			this.updateWordCount(contents, filepath);
		}, 400, false);

		this.registerView(
			VIEW_TYPE_STATS_TRACKER,
			(leaf: WorkspaceLeaf) => (this.view = new StatsTrackerView(leaf, this.settings.dayCounts, this.settings.targetDailyWords))
		);

		this.addCommand({
			id: "show-daily-stats-tracker-view",
			name: "Open tracker view",
			checkCallback: (checking: boolean) => {
				if (checking) {
					return (
						this.app.workspace.getLeavesOfType(VIEW_TYPE_STATS_TRACKER).length === 0
					);
				}
				this.initLeaf();
			},
		});

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Wann',
			callback: () => {
				new PromptModal(this.app).open();
			}
		});

		this.addSettingTab(new SettingTab(this.app, this));

		this.registerEvent(
			this.app.workspace.on("quick-preview", this.onQuickPreview.bind(this))
		);

		this.registerInterval(
			window.setInterval(() => {
				this.statusBarEl.setText(Math.min(Math.round(this.currentWordCount/this.settings.targetDailyWords *100).toFixed(2), 100)+ "%");
			}, 200)
		);

		addIcon("bar-graph", `<path fill="currentColor" stroke="currentColor" d="M122.88,105.98H9.59v-0.02c-2.65,0-5.05-1.08-6.78-2.81c-1.72-1.72-2.79-4.11-2.79-6.75H0V0h12.26v93.73h110.62V105.98 L122.88,105.98z M83.37,45.6h19.55c1.04,0,1.89,0.85,1.89,1.89v38.46c0,1.04-0.85,1.89-1.89,1.89H83.37 c-1.04,0-1.89-0.85-1.89-1.89V47.5C81.48,46.46,82.33,45.6,83.37,45.6L83.37,45.6z M25.36,22.07h19.55c1.04,0,1.89,0.85,1.89,1.89 v62c0,1.04-0.85,1.89-1.89,1.89H25.36c-1.04,0-1.89-0.85-1.89-1.89v-62C23.47,22.92,24.32,22.07,25.36,22.07L25.36,22.07 L25.36,22.07z M54.37,8.83h19.54c1.04,0,1.89,0.85,1.89,1.89v75.24c0,1.04-0.85,1.89-1.89,1.89H54.37c-1.04,0-1.89-0.85-1.89-1.89 V10.72C52.48,9.68,53.33,8.83,54.37,8.83L54.37,8.83z"/>`);
		this.registerInterval(window.setInterval(() => {
			this.updateDate();
			this.saveSettings();
		}, 1000));

		if (this.app.workspace.layoutReady) {
			this.initLeaf();
		} else {
			this.registerEvent(
				this.app.workspace.on("layout-ready", this.initLeaf.bind(this))
			);
		}
	}

	initLeaf(): void {
		if (this.app.workspace.getLeavesOfType(VIEW_TYPE_STATS_TRACKER).length) {
			return;
		}
		this.app.workspace.getRightLeaf(false).setViewState({
			type: VIEW_TYPE_STATS_TRACKER,
		});
	}

	onQuickPreview(file: TFile, contents: string) {
		if (this.app.workspace.getActiveViewOfType(MarkdownView)) {
			this.debouncedUpdate(contents, file.path);
		}
	}

	//Credit: better-word-count by Luke Leppan (https://github.com/lukeleppan/better-word-count)
	getWordCount(text: string) {
		let words: number = 0;

		const matches = text.match(
			/[a-zA-Z0-9_\u0392-\u03c9\u00c0-\u00ff\u0600-\u06ff]+|[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u3040-\u309f\uac00-\ud7af]+/gm
		);

		if (matches) {
			for (let i = 0; i < matches.length; i++) {
				if (matches[i].charCodeAt(0) > 19968) {
					words += matches[i].length;
				} else {
					words += 1;
				}
			}
		}

		return words;
	}

	updateWordCount(contents: string, filepath: string) {
		const curr = this.getWordCount(contents);
		if (this.settings.dayCounts.hasOwnProperty(this.today)) {
			if (this.settings.todaysWordCount.hasOwnProperty(filepath)) {//updating existing file
				this.settings.todaysWordCount[filepath].current = curr;
			} else {//created new file during session
				this.settings.todaysWordCount[filepath] = { initial: curr, current: curr };
			}
		} else {//new day, flush the cache
			this.settings.todaysWordCount = {};
			this.settings.todaysWordCount[filepath] = { initial: curr, current: curr };
		}
		this.updateCounts();
	}

	updateDate() {
		const d = new Date();
		this.today = d.getFullYear() + "/" + d.getMonth() + "/" + d.getDate();
	}

	updateCounts() {
		this.currentWordCount = Object.values(this.settings.todaysWordCount).map((wordCount) => Math.max(0, wordCount.current - wordCount.initial)).reduce((a, b) => a + b, 0);
		this.settings.dayCounts[this.today] = this.currentWordCount;
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		if (Object.keys(this.settings.dayCounts).length > 0) { //ensuring we never reset the data by accident
			await this.saveData(this.settings);
		}
	}
}

class SettingTab extends PluginSettingTab {
	plugin: XDailyWords;

	constructor(app: App, plugin: XDailyWords) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings for x-words-a-day'});

		new Setting(containerEl)
			.setName('Target Words')
			.setDesc('The number of words you will like to write daily — If you write less than that limit for a specific your graph will shouw red')
			.addText(text => text
				.setPlaceholder('Enter your target number of words')
				.setValue(this.plugin.settings.targetDailyWords.toString())
				.onChange(async (value) => {
					console.log('Secret: ' + value);
					let num = parseNumber(value)
					if (num == null){
						num = DEFAULT_TARGET
					}
					this.plugin.settings.targetDailyWords = num;
					await this.plugin.saveSettings();
				}));
	}
}

class PromptModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.createEl("h1", { text: "Need an idea for something to write about?" });

		//TODO - make this a dynamic content
		contentEl.createEl("div", { text: getSuggestion() });
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

function parseNumber(str: string): number | null {
	try {
	  const num = parseInt(str);
	  if (isNaN(num)) {
		return null;
	  }
	  return num;
	} catch (error) {
	  //console.error(error.message);
	  return null;
	}
  }