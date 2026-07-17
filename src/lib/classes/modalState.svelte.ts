class ModalState {
  isWorkspaceModalOpen: boolean = $state(false);
  isVideoModalOpen: boolean = $state(false);
  isMediaModalOpen: boolean = $state(false);
  mediaModalEl: HTMLElement | null = $state(null);

  constructor() {
    //
  }
}

export const modalState = new ModalState();