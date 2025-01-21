class ModalState {
  isWorkspaceModalOpen: boolean = $state(false);
  isVideoModalOpen: boolean = $state(false);
  isMediaModalOpen: boolean = $state(false);

  constructor() {
    //
  }
}

export const modalState = new ModalState();