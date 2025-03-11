import requests
import json
from flask import request, jsonify, Response
from flask_appbuilder.api import expose, permission_name, protect, safe
from superset.constants import MODEL_API_RW_METHOD_PERMISSION_MAP

from superset.views.base_api import (
    BaseSupersetApi
)

class AIChatApi(BaseSupersetApi):

    allow_browser_login = True

    method_permission_name = MODEL_API_RW_METHOD_PERMISSION_MAP

    resource_name = "ai"
    @expose("/chat", methods=("POST",))
    @protect()
    @safe
    def post(self) -> Response:
        if request.method == 'POST':
            json_payload = request.get_json()
            input_data = json_payload.get('data')
            url='http://host.docker.internal:11434/api/generate'
            headers={
                "Content-Type": "application/json"
            }
            data={
                "model": "deepseek-r1:7b",
                "prompt": input_data,
                "stream": False
            }
            response = requests.post(url, headers=headers, data=json.dumps(data))
            if response.status_code == 200:
                response_text = response.text
                data = json.loads(response_text)
                actual_response = data["response"]
                return data
            else:
                print("Error", response.status_code, response.text)
