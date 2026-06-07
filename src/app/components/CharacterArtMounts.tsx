import { useEffect, useState, type ComponentType } from 'react';
import { createPortal } from 'react-dom';
import Frame2 from '../../imports/Frame2';
import Frame3 from '../../imports/Frame3';
import Frame4 from '../../imports/Frame4';
import Frame5 from '../../imports/Frame5';

const ART: Record<string, ComponentType> = {
  mario: Frame2,
  pikachu: Frame3,
  samus: Frame4,
  link: Frame5,
};

export function CharacterArtMounts() {
  const [tick, setTick] = useState(0);
  const [p1Id, setP1Id] = useState<string>('mario');

  useEffect(() => {
    const onBuilt = () => setTick(t => t + 1);
    const onP1 = (e: Event) => setP1Id((e as CustomEvent<string>).detail);
    window.addEventListener('charselect:built', onBuilt);
    window.addEventListener('charselect:p1', onP1 as EventListener);
    return () => {
      window.removeEventListener('charselect:built', onBuilt);
      window.removeEventListener('charselect:p1', onP1 as EventListener);
    };
  }, []);

  void tick;
  const cardHosts = typeof document !== 'undefined'
    ? Array.from(document.querySelectorAll<HTMLElement>('.charart[data-cid]'))
    : [];
  const p1Host = typeof document !== 'undefined' ? document.getElementById('p1art') : null;
  const P1 = ART[p1Id];

  return (
    <>
      {cardHosts.map((el, i) => {
        const id = el.dataset.cid!;
        const C = ART[id];
        if (!C) return null;
        return createPortal(
          <div className="charart-stage"><div className="charart-fit"><C /></div></div>,
          el,
          `${id}-${i}`
        );
      })}
      {p1Host && P1 && createPortal(
        <div className="charart-stage"><div className="charart-fit"><P1 /></div></div>,
        p1Host,
        `p1-${p1Id}`
      )}
    </>
  );
}
