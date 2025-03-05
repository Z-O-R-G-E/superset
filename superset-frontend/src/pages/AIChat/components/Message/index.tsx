import { FC } from 'react';
import './Message.css';
import { Divider } from 'antd-v5';

type MessageProps = {
  sender: string;
  text: string;
  index: number;
};

export const Message: FC<MessageProps> = ({ sender, text, index }) => {
  const currentSender =
    sender === 'user' ? (
      <Divider orientation="right">Пользователь</Divider>
    ) : (
      <Divider orientation="left">БКС-бот</Divider>
    );
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
      }}
      key={index}
      className={sender}
    >
      {currentSender}
      <span>{text}</span>
    </div>
  );
};
