import { onError } from 'apollo-link-error';

import { getAuth } from '../graphql';

const link = onError(({ networkError, operation }) => {
  if (networkError && networkError.statusCode === 401) {
    const { cache } = operation.getContext();
    const query = getAuth;
    const data = cache.readQuery({
      query,
    });
    data.auth.token = null;
    cache.writeQuery({ query, data });
  }
});

export default link;
