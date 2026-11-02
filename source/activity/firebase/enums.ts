const project_id = "";

export const FirebaseURI = {
    scopes: [ "https://www.googleapis.com/auth/firebase.messaging" ],
    project_id,
    base_url: "https://fcm.googleapis.com",
    fcm_endpoint: 'v1/projects/' + project_id + '/messages:send',
};

export const fcm_url = FirebaseURI.base_url + "/" + FirebaseURI.fcm_endpoint;


