import withToasts from 'src/components/MessageToasts/withToasts';
import { FC, useEffect, useState } from 'react';
import { SupersetClient, t } from '@superset-ui/core';
import { Button, Flex, Tooltip } from 'antd-v5';
import { Input } from 'antd';
import { RightCircleOutlined } from '@ant-design/icons';
import { Message } from './components';
import './AIChat.css';
import { createErrorHandler } from '../../views/CRUD/utils';
import { addDangerToast } from '../../SqlLab/actions/sqlLab';

type messagesType = {
  sender: string;
  text: string;
}[];

const { TextArea } = Input;

const AIChat: FC = () => {
  const [input, setInput] = useState<string>('');
  const [messages, setMessages] = useState<messagesType>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isEmpty, setIsEmpty] = useState<boolean>(true);
  const [btnName, setBtnName] = useState<string>('Отправить');

  const sendMessage = () => {
    setBtnName('Обработка');
    setIsLoading(true);
    setMessages(prevState => [...prevState, { sender: 'user', text: input }]);
    setInput('');
    SupersetClient.post({
      endpoint: `/api/v1/ai/api/chat`,
      jsonPayload: { data: input },
    }).then(
      ({ json }) => {
        setMessages(prevState => [
          ...prevState,
          { sender: 'bot', text: json.response },
        ]);
        setBtnName('Отправить');
        setIsLoading(false);
      },
      createErrorHandler(errMsg =>
        addDangerToast(t('Возникла проблема: %s', errMsg)),
      ),
    );
  };

  useEffect(() => {
    if (input.length === 0 && !isLoading) {
      setIsEmpty(true);
    } else {
      setIsEmpty(false);
    }
  }, [input, isLoading]);

  return (
    <Flex className="chat-container" vertical gap="small" flex="1 0 auto">
      <div className="output-messages">
        {messages.map((message, index) => {
          const { sender, text } = message;
          return <Message sender={sender} text={text} index={index} />;
        })}
      </div>
      <Flex className="input-container" gap="small" flex="1 0 auto">
        <TextArea
          className="input-message"
          placeholder="Введите ваш запрос"
          allowClear
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <Tooltip title={isEmpty ? 'Введите текст запроса' : ''}>
          <Button
            icon={<RightCircleOutlined />}
            disabled={isEmpty}
            loading={isLoading}
            className="send-message"
            onClick={sendMessage}
          >
            {btnName}
          </Button>
        </Tooltip>
      </Flex>
    </Flex>
  );
};

export default withToasts(AIChat);
