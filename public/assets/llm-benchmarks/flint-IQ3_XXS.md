# flint (IQ3_XXS)

Tasks:
- commit: review staged changes and propose a commit message (Commit agent)
- status: explore codebase and prepare a status report (Review agent)

Tasks were completed in OpenCode in the hola-harness repo. Sample speeds
were taken by looking at the averages for the final 2-4 turns of each
task, however many were visible in the screen log output.

## Common Parameters

```
  # CPU threads
  -t 32 -tb 32
  # 128k context at q8/q4 kv cache
  -c 131072 -ctk q8_0 -ctv q4_0
```

## With `--moe-cache-mib`

| runtime   | task   | prefill | decode |
|-----------|--------|---------|--------|
| llama.cpp | commit |  146.06 |  55.98 |
| llama.cpp | commit |  319.12 |  49.12 |
| llama.cpp | commit |  319.42 |  53.33 |
| ik_llama  | commit |  328.24 |  49.41 |
| ik_llama  | commit |   97.59 |  62.85 |
| ik_llama  | commit |  293.95 |  51.21 |
| ik_llama  | commit |  257.73 |  55.36 |
| llama.cpp | status |  438.44 |  45.54 |
| llama.cpp | status |  387.46 |  47.84 |
| llama.cpp | status |  378.44 |  48.71 |
| ik_llama  | status |  259.32 |  40.79 |
| ik_llama  | status |  189.95 |  37.69 |
| ik_llama  | status |  260.41 |  38.36 |
| ik_llama  | status |  113.95 |  38.65 |

### Notes

- llama.cpp: `--moe-cache-mib 8192`
- ik_llama: `--moe-cache-mib 7556 --cpu-moe`
- llama.cpp just works
- ik_llama is hateful and backwards and likes to crash randomly
- I tried so many different `--moe-cache-mib` values with ik_llama, and
  kept encountering crashes during tasks after wasting a lot of time
  carefully tuning it so that it wouldn't crash on start. Before I tried
  the `--cpu-moe`, it filled the VRAM of the A2000 and didn't put anything
  on the RTX 3080. Abject nonsense. Seriously, screw ik_llama.

## Without `--moe-cache-mib`

| runtime   | task   | prefill | decode | notes      |
|-----------|--------|---------|--------|------------|
| llama.cpp | commit |  600.56 |  43.25 | |
| llama.cpp | commit |  236.45 |  48.79 | |
| llama.cpp | commit |  480.10 |  47.51 | |
| llama.cpp | commit |  465.28 |  41.35 | |
| ik_llama  | commit |  589.31 |  22.72 | |
| ik_llama  | commit |  153.43 |  29.11 | |
| ik_llama  | commit |  484.89 |  23.71 | |
| ik_llama  | commit |  500.74 |  23.56 | |
| llama.cpp | status |  580.89 |  20.32 | compacted |
| llama.cpp | status |  603.09 |  25.67 | compacted |
| llama.cpp | status |  410.86 |  31.03 | 2nd run |
| llama.cpp | status |  460.86 |  29.63 | 2nd run |
| llama.cpp | status |  538.74 |  27.52 | 2nd run |
| llama.cpp | status |  473.65 |  23.19 | 2nd run |
| ik_llama  | status |  466.65 |  24.50 | |
| ik_llama  | status |  396.48 |  16.01 | |
| ik_llama  | status |  428.23 |  16.04 | |
| ik_llama  | status |  230.60 |  17.15 | |
| ik_llama  | status |  396.46 |  24.85 | `-sm graph` |
| ik_llama  | status |  350.37 |  23.16 | `-sm graph` |
| ik_llama  | status |  200.70 |  24.89 | `-sm graph` |
| ik_llama  | status |  362.71 |  23.97 | `-sm graph` |

### Notes

- Once again, ik_llama was a PoS. It favored the A2000 over utilizing
  the RTX 3080.
- I had to use `-ncmoe 21` to get ik_llama to load the model.
- Did 2nd run of the status task on ik_llama with `-sm graph` for shiggles
- I ran the status task twice for llama.cpp because the first one ran to
  compaction and then completed at a lower context depth post-compaction.
  It seemed only fair to expend this modicum of additional effort for
  llama.cpp considering the hell I went through for ik_llama.
