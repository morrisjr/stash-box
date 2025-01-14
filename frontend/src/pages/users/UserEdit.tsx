import React, { useState } from "react";
import { useHistory, useParams } from "react-router-dom";

import { useUser, useUpdateUser } from "src/graphql";
import { LoadingIndicator } from "src/components/fragments";
import { userHref } from "src/utils";
import UserEditForm, { UserEditData } from "./UserEditForm";

const EditUserComponent: React.FC = () => {
  const { name = "" } = useParams<{ name?: string }>();
  const [queryError, setQueryError] = useState();
  const history = useHistory();
  const { data, loading } = useUser({ name });
  const [updateUser] = useUpdateUser();

  if (loading) return <LoadingIndicator />;
  if (name === "" || !data?.findUser) return <div>User not found!</div>;

  const user = data.findUser;

  const doUpdate = (userData: UserEditData) => {
    updateUser({ variables: { userData } })
      .then((res) => history.push(userHref(res.data?.userUpdate ?? user)))
      .catch((res) => setQueryError(res.message));
  };

  return (
    <div>
      <h3>Edit &lsquo;{user.name}&rsquo;</h3>
      <hr />
      <UserEditForm
        user={user}
        username={user.name}
        error={queryError}
        callback={doUpdate}
      />
    </div>
  );
};

export default EditUserComponent;
