type Settings = {
  markedUnread: boolean,
  translationModel: 'nmt' | 'llm',
  disableEmbedVia: boolean,
};

const defaultSettings: Settings = {
  markedUnread: false,
  translationModel: 'nmt',
  disableEmbedVia: false,
}

class SettingsState {
  settings: Settings = $state(defaultSettings);
  pdsRequestReady: boolean = $state(false);

  constructor() {
    const storageSettings = localStorage.getItem('stateSettings') || JSON.stringify(defaultSettings);
    this.settings = JSON.parse(storageSettings);

    $effect.root(() => {
      $effect(() => {
        localStorage.setItem('stateSettings', JSON.stringify(this.settings));
      });
      return () => {};
    })
  }

  setPdsRequestReady() {
    this.pdsRequestReady = true;
  }
}

export const settingsState = new SettingsState();