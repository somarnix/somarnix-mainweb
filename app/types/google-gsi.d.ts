type GoogleIdCredentialResponse = {
  credential?: string;
};

type GoogleIdApi = {
  initialize: (options: {
    client_id: string;
    use_fedcm_for_prompt?: boolean;
    callback: (response: GoogleIdCredentialResponse) => void;
  }) => void;
  prompt: () => void;
};

interface Window {
  google?: {
    accounts?: {
      id?: GoogleIdApi;
    };
  };
}
