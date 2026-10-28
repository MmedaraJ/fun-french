import { Build } from './Build';
import { Flash } from './Flash';
import { Gender } from './Gender';
import { Listen } from './Listen';
import { Pairs } from './Pairs';
import { PickImage } from './PickImage';
import { PickWord } from './PickWord';
import { Speak } from './Speak';
import { Spell } from './Spell';
import { TypeIt } from './TypeIt';
import type { QProps } from './types';

export function QuestionView(props: QProps) {
  switch (props.q.type) {
    case 'pick-image':
      return <PickImage {...props} />;
    case 'pick-word':
      return <PickWord {...props} />;
    case 'listen':
      return <Listen {...props} />;
    case 'spell':
      return <Spell {...props} />;
    case 'gender':
      return <Gender {...props} />;
    case 'build':
      return <Build {...props} />;
    case 'type':
      return <TypeIt {...props} />;
    case 'flash':
      return <Flash {...props} />;
    case 'speak':
      return <Speak {...props} />;
    case 'pairs':
      return <Pairs {...props} />;
  }
}
