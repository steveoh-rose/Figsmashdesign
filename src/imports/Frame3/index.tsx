import svgPaths from "./svg-lb22v9tweg";

function Group2() {
  return (
    <div className="h-[245.981px] relative w-[178.375px]">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 178.375 245.981">
        <g id="Group 8">
          <path d={svgPaths.p3af79600} fill="var(--fill-0, black)" id="Vector" />
          <path d={svgPaths.p14383b0} fill="var(--fill-0, #FEDE10)" id="Vector_2" />
          <path d={svgPaths.pdf8fd00} fill="var(--fill-0, #EC9E1F)" id="Vector_3" />
        </g>
      </svg>
    </div>
  );
}

function Group() {
  return (
    <div className="-translate-x-1/2 -translate-y-1/2 absolute h-[349.532px] left-[calc(50%+18.52px)] top-[calc(50%+71.99px)] w-[299.039px]">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 299.039 349.532">
        <g id="Group 2">
          <path d={svgPaths.p2321f700} fill="var(--fill-0, #040403)" id="Vector" />
          <path d={svgPaths.p1d78ec00} fill="var(--fill-0, #F3F3F3)" id="Vector_2" />
        </g>
      </svg>
    </div>
  );
}

function Group1() {
  return (
    <div className="h-[275.328px] relative w-[214.354px]">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 214.354 275.328">
        <g id="Group 7">
          <path d={svgPaths.p2e3cdc80} fill="var(--fill-0, black)" id="Vector" />
          <path d={svgPaths.p29378900} fill="var(--fill-0, #FEDE10)" id="Vector_2" />
          <path d={svgPaths.p21471900} fill="var(--fill-0, #EC9E1F)" id="Vector_3" />
        </g>
      </svg>
    </div>
  );
}

function LightningRat() {
  return (
    <div className="-translate-x-1/2 -translate-y-1/2 absolute contents left-[calc(50%-0.32px)] top-[calc(50%+0.38px)]" data-name="lightning rat">
      <div className="-translate-x-1/2 -translate-y-1/2 absolute flex h-[303.849px] items-center justify-center left-[calc(50%-45.53px)] top-[calc(50%-94.08px)] w-[288.936px]">
        <div className="flex-none rotate-[36.03deg]">
          <Group2 />
        </div>
      </div>
      <Group />
      <div className="-translate-x-1/2 -translate-y-1/2 absolute flex h-[282.28px] items-center justify-center left-[calc(50%+77.68px)] top-[calc(50%-90.86px)] w-[223.36px]">
        <div className="-scale-y-100 flex-none rotate-[178.1deg]">
          <Group1 />
        </div>
      </div>
    </div>
  );
}

export default function Frame() {
  return (
    <div className="relative size-full">
      <LightningRat />
    </div>
  );
}