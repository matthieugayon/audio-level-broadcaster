import { useEffect } from 'react';
import { FaMicrophoneAlt } from 'react-icons/fa';
import { useShallow } from 'zustand/react/shallow'

import { useAudioApi } from '../AudioApi';
import FloatingButton from './FloatingButton';

const Microphone: React.FC = () => {
  useEffect(() => {
    const audioApi = useAudioApi.getState();
    audioApi.initSharedWorker();
    audioApi.initGraph()
      .catch((e) => console.error(e))
      .then(() => console.log('Audio graph initialized'));
  }, []);

  const { gain, setGain } = useAudioApi(
    useShallow((state) => ({ gain: state.gain, setGain: state.setGain })),
  );

  return (
    <div className="flex flex-col justify-center items-center h-screen">
      <FaMicrophoneAlt className="text-6xl" style={{ color: '#7a8088' }}/>

      {/* Gain control */}
      <div className="flex flex-col items-center space-y-4 p-8">
        <input
          type="range"
          min="-80"
          max="12"
          value={20 * Math.log10(gain)}
          step="0.01"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const dB = parseFloat(e.target.value);
            const linearGain = Math.pow(10, dB / 20);
            setGain(linearGain);
          }}
          className="relative cursor-pointer bg-transparentgain-slider"
        />
        <div className='gain-value'>{parseFloat((20 * Math.log10(gain)).toFixed())} dB</div>
      </div>

      <FloatingButton url={'/level-meter'} />
    </div>
  );
};

export default Microphone;
