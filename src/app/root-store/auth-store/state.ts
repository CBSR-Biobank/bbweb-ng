import { User } from '@app/domain/users';

export interface State {
  isLoggingIn?: boolean;
  isRegistering?: boolean;
  error?: any;
  user?: User;
  registeredUser?: User;
}

// FIXME: this is a hacky way of determining the initial state
function getLocalStorageUser() {
  const authToken = JSON.parse(localStorage.getItem('authToken'));
  if (authToken === null) {
    return null;
  }
  return new User().deserialize(authToken.user);
}

export const initialState: State = {
  isLoggingIn: false,
  isRegistering: false,
  error: null,
  user: getLocalStorageUser(),
  registeredUser: null
};