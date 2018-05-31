import { onError } from 'apollo-link-error';

import { authQuery, getAuth } from '../graphql';

const link = onError(({ networkError, operation }) => {
  if (networkError && networkError.statusCode === 401) {
    const { cache } = operation.getContext();
    const auth = getAuth(cache);

    auth.token = null;
    cache.writeQuery({ query: authQuery, data: { auth } });
  }
});

export default link;
