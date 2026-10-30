# Setup

1. Installed llama.cpp using the installer script (downloaded to file to inspect and be able to rerun a good copy instead of yoloing curl straight into sh).
2. Copied my GGUF files I had downloaded from [Hugging Face](https://hf.co) onto new machine using sftp batch mode.
3. Directory setup: `~/Downloads/models/weights` and `~/Downloads/models/stats`; CWD of `~/Downloads/models`
4. Installed and ran `nvtop`, but the GPUs were not recognized.
5. Ran `for model in $(ls weights/ | grep -vi mmproj | grep -vi mtp); do llama bench -m weights/$model | tee -a stats/$model.log; done` to get baseline performance. All ran on CPU only, so I ran `mkdir stats/cpu && mv stats/*.log stats/cpu/ && mkdir stats/gpus`.
6. Installed nvidia drivers and rebooted:
    ```bash
    sudo apt update
    sudo apt install linux-headers-$(uname -r) ubuntu-drivers-common
    ubuntu-drivers devices
    sudo ubuntu-drivers install
    sudo reboot
    ```
7. `llama bench --list-devices` output "Available Devices: (none)", so I rebuilt llama using the installer script.
8. Ran `for model in $(ls weights | grep -vi mmproj | grep -vi mtp); do llama bench -m weights/$model | tee -a stats/gpus/$model.log; done` to get GPU performance baseline. A number of MoE models did not fit in combined VRAM, leading to cudamalloc errors and benchmark failures. The following model files *did* load and benchmark correctly in VRAM:
    - Cyber-Tiel-Coder-35B-A3B-UD-IQ3_XXS.gguf.log
    - MiniCPM-V-4_7-35B-A3B-IQ3_XS.gguf.log
9. Ran benchmarks with `-ncmoe [25|100]` for additional performance characteristics.
10. Compiled results with bash-fu, downloaded with sftp, edited with vim-fu, then copied with `cat scoreboard.md | xclip -selection clipboard` to paste into here easily.

<details>
<summary>bash-fu for sftp batch upload</summary>

```bash
{
echo "cd ~/Downloads/models/weights"
for file in $(ls weights/); do
  echo "put weights/$file"
done
} | sftp -oBatchMode=yes -b - user@x.x.x.x
```
NB1: I input it in one line with semicolons because I prefer that style in my bash hustory but broke it out here for readability
</details>

<details>
<summary>bash-fu for scoreboard compilation</summary>

```bash
{
for model in $(ls weights/); do
  echo "## $model"; echo
  for setup in $(ls stats/); do
    echo "### $setup"
    cat stats/$setup/$model.log
  done
done
} > scoreboard.md
```

NB2: see NB1

NB3: vim-fu was to remove file extensions from headers and the repetitive "build" line
</details>
<br>

# llama bench

<details>
<summary>Click to expand. This is a lot of data.</summary>

## Cyber-Tiel-Coder-35B-A3B-UD-IQ3_XXS

### cpu

| model                          |       size |     params | backend    | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | ------: | --------------: | -------------------: |
| qwen35moe 35B.A3B IQ3_XXS - 3.0625 bpw |  12.29 GiB |    34.66 B | CPU        |      16 |           pp512 |        140.17 ± 4.98 |
| qwen35moe 35B.A3B IQ3_XXS - 3.0625 bpw |  12.29 GiB |    34.66 B | CPU        |      16 |           tg128 |          6.18 ± 0.01 |

### cpu-32t

| model                          |       size |     params | backend    | ngl | threads | dev          |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ------: | ------------ | --------------: | -------------------: |
| qwen35moe 35B.A3B IQ3_XXS - 3.0625 bpw |  12.29 GiB |    34.66 B | CUDA       |   0 |      32 | none         |           pp512 |        128.07 ± 5.67 |
| qwen35moe 35B.A3B IQ3_XXS - 3.0625 bpw |  12.29 GiB |    34.66 B | CUDA       |   0 |      32 | none         |           tg128 |          5.35 ± 0.01 |

### gpus

| model                          |       size |     params | backend    | ngl |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | --------------: | -------------------: |
| qwen35moe 35B.A3B IQ3_XXS - 3.0625 bpw |  12.29 GiB |    34.66 B | CUDA       |  -1 |           pp512 |      2166.72 ± 37.88 |
| qwen35moe 35B.A3B IQ3_XXS - 3.0625 bpw |  12.29 GiB |    34.66 B | CUDA       |  -1 |           tg128 |         93.85 ± 0.71 |

### gpus-32t

| model                          |       size |     params | backend    | ngl | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ------: | --------------: | -------------------: |
| qwen35moe 35B.A3B IQ3_XXS - 3.0625 bpw |  12.29 GiB |    34.66 B | CUDA       |  -1 |      32 |           pp512 |      2141.52 ± 19.35 |
| qwen35moe 35B.A3B IQ3_XXS - 3.0625 bpw |  12.29 GiB |    34.66 B | CUDA       |  -1 |      32 |           tg128 |         93.51 ± 0.71 |

### gpus-32t-ncmoe10

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| qwen35moe 35B.A3B IQ3_XXS - 3.0625 bpw |  12.29 GiB |    34.66 B | CUDA       |  -1 |         10 |      32 |           pp512 |       837.66 ± 12.07 |
| qwen35moe 35B.A3B IQ3_XXS - 3.0625 bpw |  12.29 GiB |    34.66 B | CUDA       |  -1 |         10 |      32 |           tg128 |         53.11 ± 6.14 |

### gpus-32t-ncmoe100

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| qwen35moe 35B.A3B IQ3_XXS - 3.0625 bpw |  12.29 GiB |    34.66 B | CUDA       |  -1 |        100 |      32 |           pp512 |        357.50 ± 3.44 |
| qwen35moe 35B.A3B IQ3_XXS - 3.0625 bpw |  12.29 GiB |    34.66 B | CUDA       |  -1 |        100 |      32 |           tg128 |         25.10 ± 2.18 |

### gpus-32t-ncmoe25

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| qwen35moe 35B.A3B IQ3_XXS - 3.0625 bpw |  12.29 GiB |    34.66 B | CUDA       |  -1 |         25 |      32 |           pp512 |       481.48 ± 11.79 |
| qwen35moe 35B.A3B IQ3_XXS - 3.0625 bpw |  12.29 GiB |    34.66 B | CUDA       |  -1 |         25 |      32 |           tg128 |         34.09 ± 3.55 |

### gpus-32t-ncmoe50

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| qwen35moe 35B.A3B IQ3_XXS - 3.0625 bpw |  12.29 GiB |    34.66 B | CUDA       |  -1 |         50 |      32 |           pp512 |        357.47 ± 3.98 |
| qwen35moe 35B.A3B IQ3_XXS - 3.0625 bpw |  12.29 GiB |    34.66 B | CUDA       |  -1 |         50 |      32 |           tg128 |         25.35 ± 2.13 |

### gpus-ncmoe10

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| qwen35moe 35B.A3B IQ3_XXS - 3.0625 bpw |  12.29 GiB |    34.66 B | CUDA       |  -1 |         10 |           pp512 |       838.69 ± 12.15 |
| qwen35moe 35B.A3B IQ3_XXS - 3.0625 bpw |  12.29 GiB |    34.66 B | CUDA       |  -1 |         10 |           tg128 |         66.76 ± 0.76 |

### gpus-ncmoe100

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| qwen35moe 35B.A3B IQ3_XXS - 3.0625 bpw |  12.29 GiB |    34.66 B | CUDA       |  -1 |        100 |           pp512 |        356.58 ± 3.30 |
| qwen35moe 35B.A3B IQ3_XXS - 3.0625 bpw |  12.29 GiB |    34.66 B | CUDA       |  -1 |        100 |           tg128 |         31.49 ± 0.50 |

### gpus-ncmoe25

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| qwen35moe 35B.A3B IQ3_XXS - 3.0625 bpw |  12.29 GiB |    34.66 B | CUDA       |  -1 |         25 |           pp512 |        486.63 ± 7.53 |
| qwen35moe 35B.A3B IQ3_XXS - 3.0625 bpw |  12.29 GiB |    34.66 B | CUDA       |  -1 |         25 |           tg128 |         41.65 ± 0.56 |

### gpus-ncmoe50

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| qwen35moe 35B.A3B IQ3_XXS - 3.0625 bpw |  12.29 GiB |    34.66 B | CUDA       |  -1 |         50 |           pp512 |        358.73 ± 3.28 |
| qwen35moe 35B.A3B IQ3_XXS - 3.0625 bpw |  12.29 GiB |    34.66 B | CUDA       |  -1 |         50 |           tg128 |         31.36 ± 0.45 |

## Cyber-Tiel-Coder-35B-A3B-UD-Q3_K_XL

### cpu

| model                          |       size |     params | backend    | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | ------: | --------------: | -------------------: |
| qwen35moe 35B.A3B Q3_K - Medium |  15.68 GiB |    34.66 B | CPU        |      16 |           pp512 |        113.66 ± 0.86 |
| qwen35moe 35B.A3B Q3_K - Medium |  15.68 GiB |    34.66 B | CPU        |      16 |           tg128 |          5.31 ± 0.01 |

### cpu-32t

| model                          |       size |     params | backend    | ngl | threads | dev          |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ------: | ------------ | --------------: | -------------------: |
| qwen35moe 35B.A3B Q3_K - Medium |  15.68 GiB |    34.66 B | CUDA       |   0 |      32 | none         |           pp512 |        102.90 ± 2.37 |
| qwen35moe 35B.A3B Q3_K - Medium |  15.68 GiB |    34.66 B | CUDA       |   0 |      32 | none         |           tg128 |          4.68 ± 0.06 |

### gpus

| model                          |       size |     params | backend    | ngl |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | --------------: | -------------------: |
### gpus-32t

| model                          |       size |     params | backend    | ngl | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ------: | --------------: | -------------------: |
### gpus-32t-ncmoe10

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
### gpus-32t-ncmoe100

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| qwen35moe 35B.A3B Q3_K - Medium |  15.68 GiB |    34.66 B | CUDA       |  -1 |        100 |      32 |           pp512 |        289.20 ± 3.30 |
| qwen35moe 35B.A3B Q3_K - Medium |  15.68 GiB |    34.66 B | CUDA       |  -1 |        100 |      32 |           tg128 |         21.45 ± 1.31 |

### gpus-32t-ncmoe25

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
### gpus-32t-ncmoe50

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| qwen35moe 35B.A3B Q3_K - Medium |  15.68 GiB |    34.66 B | CUDA       |  -1 |         50 |      32 |           pp512 |        292.12 ± 4.59 |
| qwen35moe 35B.A3B Q3_K - Medium |  15.68 GiB |    34.66 B | CUDA       |  -1 |         50 |      32 |           tg128 |         21.32 ± 0.95 |

### gpus-ncmoe10

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
### gpus-ncmoe100

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| qwen35moe 35B.A3B Q3_K - Medium |  15.68 GiB |    34.66 B | CUDA       |  -1 |        100 |           pp512 |        293.22 ± 3.64 |
| qwen35moe 35B.A3B Q3_K - Medium |  15.68 GiB |    34.66 B | CUDA       |  -1 |        100 |           tg128 |         25.80 ± 0.19 |

### gpus-ncmoe25

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
### gpus-ncmoe50

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| qwen35moe 35B.A3B Q3_K - Medium |  15.68 GiB |    34.66 B | CUDA       |  -1 |         50 |           pp512 |        291.63 ± 4.33 |
| qwen35moe 35B.A3B Q3_K - Medium |  15.68 GiB |    34.66 B | CUDA       |  -1 |         50 |           tg128 |         24.39 ± 0.21 |

## Cyber-Tiel-Coder-35B-A3B-UD-Q4_K_M

### cpu

| model                          |       size |     params | backend    | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | ------: | --------------: | -------------------: |
| qwen35moe 35B.A3B Q4_K - Medium |  20.60 GiB |    34.66 B | CPU        |      16 |           pp512 |         98.82 ± 7.61 |
| qwen35moe 35B.A3B Q4_K - Medium |  20.60 GiB |    34.66 B | CPU        |      16 |           tg128 |          5.03 ± 0.01 |

### cpu-32t

| model                          |       size |     params | backend    | ngl | threads | dev          |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ------: | ------------ | --------------: | -------------------: |
| qwen35moe 35B.A3B Q4_K - Medium |  20.60 GiB |    34.66 B | CUDA       |   0 |      32 | none         |           pp512 |        76.63 ± 14.32 |
| qwen35moe 35B.A3B Q4_K - Medium |  20.60 GiB |    34.66 B | CUDA       |   0 |      32 | none         |           tg128 |          4.24 ± 0.10 |

### gpus

| model                          |       size |     params | backend    | ngl |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | --------------: | -------------------: |
### gpus-32t

| model                          |       size |     params | backend    | ngl | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ------: | --------------: | -------------------: |
### gpus-32t-ncmoe10

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
### gpus-32t-ncmoe100

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| qwen35moe 35B.A3B Q4_K - Medium |  20.60 GiB |    34.66 B | CUDA       |  -1 |        100 |      32 |           pp512 |        222.20 ± 2.37 |
| qwen35moe 35B.A3B Q4_K - Medium |  20.60 GiB |    34.66 B | CUDA       |  -1 |        100 |      32 |           tg128 |         17.37 ± 0.74 |

### gpus-32t-ncmoe25

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
### gpus-32t-ncmoe50

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| qwen35moe 35B.A3B Q4_K - Medium |  20.60 GiB |    34.66 B | CUDA       |  -1 |         50 |      32 |           pp512 |        220.40 ± 3.96 |
| qwen35moe 35B.A3B Q4_K - Medium |  20.60 GiB |    34.66 B | CUDA       |  -1 |         50 |      32 |           tg128 |         17.58 ± 0.79 |

### gpus-ncmoe10

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
### gpus-ncmoe100

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| qwen35moe 35B.A3B Q4_K - Medium |  20.60 GiB |    34.66 B | CUDA       |  -1 |        100 |           pp512 |        221.77 ± 2.45 |
| qwen35moe 35B.A3B Q4_K - Medium |  20.60 GiB |    34.66 B | CUDA       |  -1 |        100 |           tg128 |         20.55 ± 0.15 |

### gpus-ncmoe25

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
### gpus-ncmoe50

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| qwen35moe 35B.A3B Q4_K - Medium |  20.60 GiB |    34.66 B | CUDA       |  -1 |         50 |           pp512 |        220.89 ± 2.24 |
| qwen35moe 35B.A3B Q4_K - Medium |  20.60 GiB |    34.66 B | CUDA       |  -1 |         50 |           tg128 |         20.55 ± 0.16 |

## Cyber-Tiel-Coder-35B-A3B-UD-Q4_K_S

### cpu

| model                          |       size |     params | backend    | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | ------: | --------------: | -------------------: |
| qwen35moe 35B.A3B Q4_K - Medium |  19.45 GiB |    34.66 B | CPU        |      16 |           pp512 |        110.41 ± 3.66 |
| qwen35moe 35B.A3B Q4_K - Medium |  19.45 GiB |    34.66 B | CPU        |      16 |           tg128 |          5.06 ± 0.03 |

### cpu-32t

| model                          |       size |     params | backend    | ngl | threads | dev          |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ------: | ------------ | --------------: | -------------------: |
| qwen35moe 35B.A3B Q4_K - Medium |  19.45 GiB |    34.66 B | CUDA       |   0 |      32 | none         |           pp512 |         88.87 ± 3.73 |
| qwen35moe 35B.A3B Q4_K - Medium |  19.45 GiB |    34.66 B | CUDA       |   0 |      32 | none         |           tg128 |          4.06 ± 0.18 |

### gpus

| model                          |       size |     params | backend    | ngl |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | --------------: | -------------------: |
### gpus-32t

| model                          |       size |     params | backend    | ngl | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ------: | --------------: | -------------------: |
### gpus-32t-ncmoe10

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
### gpus-32t-ncmoe100

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| qwen35moe 35B.A3B Q4_K - Medium |  19.45 GiB |    34.66 B | CUDA       |  -1 |        100 |      32 |           pp512 |        234.62 ± 3.31 |
| qwen35moe 35B.A3B Q4_K - Medium |  19.45 GiB |    34.66 B | CUDA       |  -1 |        100 |      32 |           tg128 |         17.40 ± 1.21 |

### gpus-32t-ncmoe25

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
### gpus-32t-ncmoe50

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| qwen35moe 35B.A3B Q4_K - Medium |  19.45 GiB |    34.66 B | CUDA       |  -1 |         50 |      32 |           pp512 |        234.84 ± 3.39 |
| qwen35moe 35B.A3B Q4_K - Medium |  19.45 GiB |    34.66 B | CUDA       |  -1 |         50 |      32 |           tg128 |         17.42 ± 0.53 |

### gpus-ncmoe10

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
### gpus-ncmoe100

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| qwen35moe 35B.A3B Q4_K - Medium |  19.45 GiB |    34.66 B | CUDA       |  -1 |        100 |           pp512 |        235.52 ± 1.92 |
| qwen35moe 35B.A3B Q4_K - Medium |  19.45 GiB |    34.66 B | CUDA       |  -1 |        100 |           tg128 |         21.48 ± 0.17 |

### gpus-ncmoe25

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
### gpus-ncmoe50

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| qwen35moe 35B.A3B Q4_K - Medium |  19.45 GiB |    34.66 B | CUDA       |  -1 |         50 |           pp512 |        236.48 ± 2.20 |
| qwen35moe 35B.A3B Q4_K - Medium |  19.45 GiB |    34.66 B | CUDA       |  -1 |         50 |           tg128 |         21.20 ± 0.15 |

## Falcon-H1-Tiny-90M-Coder-Q8_0

### cpu

| model                          |       size |     params | backend    | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | ------: | --------------: | -------------------: |
| falcon-h1 1.5B Q8_0            | 109.72 MiB |   107.91 M | CPU        |      16 |           pp512 |       2809.71 ± 7.49 |
| falcon-h1 1.5B Q8_0            | 109.72 MiB |   107.91 M | CPU        |      16 |           tg128 |        171.62 ± 6.49 |

### cpu-32t

| model                          |       size |     params | backend    | ngl | threads | dev          |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ------: | ------------ | --------------: | -------------------: |
| falcon-h1 1.5B Q8_0            | 109.72 MiB |   107.91 M | CUDA       |   0 |      32 | none         |           pp512 |     2866.00 ± 133.84 |
| falcon-h1 1.5B Q8_0            | 109.72 MiB |   107.91 M | CUDA       |   0 |      32 | none         |           tg128 |        143.53 ± 1.33 |

### gpus

| model                          |       size |     params | backend    | ngl |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | --------------: | -------------------: |
| falcon-h1 1.5B Q8_0            | 109.72 MiB |   107.91 M | CUDA       |  -1 |           pp512 |     9385.55 ± 755.49 |
| falcon-h1 1.5B Q8_0            | 109.72 MiB |   107.91 M | CUDA       |  -1 |           tg128 |        205.69 ± 3.88 |

### gpus-32t

| model                          |       size |     params | backend    | ngl | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ------: | --------------: | -------------------: |
| falcon-h1 1.5B Q8_0            | 109.72 MiB |   107.91 M | CUDA       |  -1 |      32 |           pp512 |    7969.76 ± 1390.88 |
| falcon-h1 1.5B Q8_0            | 109.72 MiB |   107.91 M | CUDA       |  -1 |      32 |           tg128 |       141.75 ± 16.37 |

### gpus-32t-ncmoe10

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| falcon-h1 1.5B Q8_0            | 109.72 MiB |   107.91 M | CUDA       |  -1 |         10 |      32 |           pp512 |     8504.19 ± 549.97 |
| falcon-h1 1.5B Q8_0            | 109.72 MiB |   107.91 M | CUDA       |  -1 |         10 |      32 |           tg128 |       153.30 ± 34.84 |

### gpus-32t-ncmoe100

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| falcon-h1 1.5B Q8_0            | 109.72 MiB |   107.91 M | CUDA       |  -1 |        100 |      32 |           pp512 |     8542.06 ± 487.72 |
| falcon-h1 1.5B Q8_0            | 109.72 MiB |   107.91 M | CUDA       |  -1 |        100 |      32 |           tg128 |        105.81 ± 9.86 |

### gpus-32t-ncmoe25

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| falcon-h1 1.5B Q8_0            | 109.72 MiB |   107.91 M | CUDA       |  -1 |         25 |      32 |           pp512 |     8247.40 ± 481.01 |
| falcon-h1 1.5B Q8_0            | 109.72 MiB |   107.91 M | CUDA       |  -1 |         25 |      32 |           tg128 |       113.89 ± 22.05 |

### gpus-32t-ncmoe50

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| falcon-h1 1.5B Q8_0            | 109.72 MiB |   107.91 M | CUDA       |  -1 |         50 |      32 |           pp512 |    7209.38 ± 2564.50 |
| falcon-h1 1.5B Q8_0            | 109.72 MiB |   107.91 M | CUDA       |  -1 |         50 |      32 |           tg128 |       112.64 ± 27.43 |

### gpus-ncmoe10

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| falcon-h1 1.5B Q8_0            | 109.72 MiB |   107.91 M | CUDA       |  -1 |         10 |           pp512 |     9523.91 ± 561.10 |
| falcon-h1 1.5B Q8_0            | 109.72 MiB |   107.91 M | CUDA       |  -1 |         10 |           tg128 |        206.57 ± 3.52 |

### gpus-ncmoe100

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| falcon-h1 1.5B Q8_0            | 109.72 MiB |   107.91 M | CUDA       |  -1 |        100 |           pp512 |     9249.67 ± 623.37 |
| falcon-h1 1.5B Q8_0            | 109.72 MiB |   107.91 M | CUDA       |  -1 |        100 |           tg128 |        209.56 ± 1.27 |

### gpus-ncmoe25

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| falcon-h1 1.5B Q8_0            | 109.72 MiB |   107.91 M | CUDA       |  -1 |         25 |           pp512 |     8967.14 ± 530.26 |
| falcon-h1 1.5B Q8_0            | 109.72 MiB |   107.91 M | CUDA       |  -1 |         25 |           tg128 |        207.68 ± 2.67 |

### gpus-ncmoe50

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| falcon-h1 1.5B Q8_0            | 109.72 MiB |   107.91 M | CUDA       |  -1 |         50 |           pp512 |     9041.77 ± 450.88 |
| falcon-h1 1.5B Q8_0            | 109.72 MiB |   107.91 M | CUDA       |  -1 |         50 |           tg128 |        208.44 ± 1.62 |

## Falcon-H1-Tiny-90M-Instruct-Q8_0

### cpu

| model                          |       size |     params | backend    | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | ------: | --------------: | -------------------: |
| falcon-h1 1.5B Q8_0            |  92.72 MiB |    91.13 M | CPU        |      16 |           pp512 |       2820.42 ± 9.26 |
| falcon-h1 1.5B Q8_0            |  92.72 MiB |    91.13 M | CPU        |      16 |           tg128 |        175.25 ± 0.56 |

### cpu-32t

| model                          |       size |     params | backend    | ngl | threads | dev          |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ------: | ------------ | --------------: | -------------------: |
| falcon-h1 1.5B Q8_0            |  92.72 MiB |    91.13 M | CUDA       |   0 |      32 | none         |           pp512 |      2758.77 ± 98.84 |
| falcon-h1 1.5B Q8_0            |  92.72 MiB |    91.13 M | CUDA       |   0 |      32 | none         |           tg128 |       131.43 ± 27.61 |

### gpus

| model                          |       size |     params | backend    | ngl |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | --------------: | -------------------: |
| falcon-h1 1.5B Q8_0            |  92.72 MiB |    91.13 M | CUDA       |  -1 |           pp512 |    10086.67 ± 619.10 |
| falcon-h1 1.5B Q8_0            |  92.72 MiB |    91.13 M | CUDA       |  -1 |           tg128 |        212.12 ± 1.18 |

### gpus-32t

| model                          |       size |     params | backend    | ngl | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ------: | --------------: | -------------------: |
| falcon-h1 1.5B Q8_0            |  92.72 MiB |    91.13 M | CUDA       |  -1 |      32 |           pp512 |    8784.16 ± 1413.57 |
| falcon-h1 1.5B Q8_0            |  92.72 MiB |    91.13 M | CUDA       |  -1 |      32 |           tg128 |       138.45 ± 40.60 |

### gpus-32t-ncmoe10

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| falcon-h1 1.5B Q8_0            |  92.72 MiB |    91.13 M | CUDA       |  -1 |         10 |      32 |           pp512 |     8165.59 ± 480.22 |
| falcon-h1 1.5B Q8_0            |  92.72 MiB |    91.13 M | CUDA       |  -1 |         10 |      32 |           tg128 |       153.01 ± 23.18 |

### gpus-32t-ncmoe100

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| falcon-h1 1.5B Q8_0            |  92.72 MiB |    91.13 M | CUDA       |  -1 |        100 |      32 |           pp512 |    7669.37 ± 1197.63 |
| falcon-h1 1.5B Q8_0            |  92.72 MiB |    91.13 M | CUDA       |  -1 |        100 |      32 |           tg128 |       110.87 ± 29.60 |

### gpus-32t-ncmoe25

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| falcon-h1 1.5B Q8_0            |  92.72 MiB |    91.13 M | CUDA       |  -1 |         25 |      32 |           pp512 |    7318.04 ± 1707.28 |
| falcon-h1 1.5B Q8_0            |  92.72 MiB |    91.13 M | CUDA       |  -1 |         25 |      32 |           tg128 |       149.60 ± 11.33 |

### gpus-32t-ncmoe50

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| falcon-h1 1.5B Q8_0            |  92.72 MiB |    91.13 M | CUDA       |  -1 |         50 |      32 |           pp512 |     7470.54 ± 890.16 |
| falcon-h1 1.5B Q8_0            |  92.72 MiB |    91.13 M | CUDA       |  -1 |         50 |      32 |           tg128 |       131.33 ± 30.44 |

### gpus-ncmoe10

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| falcon-h1 1.5B Q8_0            |  92.72 MiB |    91.13 M | CUDA       |  -1 |         10 |           pp512 |     9281.10 ± 467.31 |
| falcon-h1 1.5B Q8_0            |  92.72 MiB |    91.13 M | CUDA       |  -1 |         10 |           tg128 |        213.70 ± 1.47 |

### gpus-ncmoe100

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| falcon-h1 1.5B Q8_0            |  92.72 MiB |    91.13 M | CUDA       |  -1 |        100 |           pp512 |     9326.27 ± 499.62 |
| falcon-h1 1.5B Q8_0            |  92.72 MiB |    91.13 M | CUDA       |  -1 |        100 |           tg128 |        211.51 ± 0.58 |

### gpus-ncmoe25

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| falcon-h1 1.5B Q8_0            |  92.72 MiB |    91.13 M | CUDA       |  -1 |         25 |           pp512 |     9414.99 ± 507.58 |
| falcon-h1 1.5B Q8_0            |  92.72 MiB |    91.13 M | CUDA       |  -1 |         25 |           tg128 |        210.83 ± 1.38 |

### gpus-ncmoe50

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| falcon-h1 1.5B Q8_0            |  92.72 MiB |    91.13 M | CUDA       |  -1 |         50 |           pp512 |     9277.24 ± 667.69 |
| falcon-h1 1.5B Q8_0            |  92.72 MiB |    91.13 M | CUDA       |  -1 |         50 |           tg128 |        211.35 ± 2.48 |

## Falcon-H1R-7B-Q4_K_M

### cpu

| model                          |       size |     params | backend    | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | ------: | --------------: | -------------------: |
| falcon-h1 7B Q4_K - Medium     |   4.28 GiB |     7.59 B | CPU        |      16 |           pp512 |        105.87 ± 1.02 |
| falcon-h1 7B Q4_K - Medium     |   4.28 GiB |     7.59 B | CPU        |      16 |           tg128 |          3.18 ± 0.00 |

### cpu-32t

| model                          |       size |     params | backend    | ngl | threads | dev          |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ------: | ------------ | --------------: | -------------------: |
| falcon-h1 7B Q4_K - Medium     |   4.28 GiB |     7.59 B | CUDA       |   0 |      32 | none         |           pp512 |        105.15 ± 2.74 |
| falcon-h1 7B Q4_K - Medium     |   4.28 GiB |     7.59 B | CUDA       |   0 |      32 | none         |           tg128 |          2.83 ± 0.01 |

### gpus

| model                          |       size |     params | backend    | ngl |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | --------------: | -------------------: |
| falcon-h1 7B Q4_K - Medium     |   4.28 GiB |     7.59 B | CUDA       |  -1 |           pp512 |      2337.46 ± 21.74 |
| falcon-h1 7B Q4_K - Medium     |   4.28 GiB |     7.59 B | CUDA       |  -1 |           tg128 |         69.55 ± 0.12 |

### gpus-32t

| model                          |       size |     params | backend    | ngl | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ------: | --------------: | -------------------: |
| falcon-h1 7B Q4_K - Medium     |   4.28 GiB |     7.59 B | CUDA       |  -1 |      32 |           pp512 |      2330.54 ± 42.41 |
| falcon-h1 7B Q4_K - Medium     |   4.28 GiB |     7.59 B | CUDA       |  -1 |      32 |           tg128 |         69.38 ± 0.08 |

### gpus-32t-ncmoe10

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| falcon-h1 7B Q4_K - Medium     |   4.28 GiB |     7.59 B | CUDA       |  -1 |         10 |      32 |           pp512 |      2296.49 ± 51.00 |
| falcon-h1 7B Q4_K - Medium     |   4.28 GiB |     7.59 B | CUDA       |  -1 |         10 |      32 |           tg128 |         69.17 ± 0.08 |

### gpus-32t-ncmoe100

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| falcon-h1 7B Q4_K - Medium     |   4.28 GiB |     7.59 B | CUDA       |  -1 |        100 |      32 |           pp512 |      2311.77 ± 40.98 |
| falcon-h1 7B Q4_K - Medium     |   4.28 GiB |     7.59 B | CUDA       |  -1 |        100 |      32 |           tg128 |         69.12 ± 0.05 |

### gpus-32t-ncmoe25

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| falcon-h1 7B Q4_K - Medium     |   4.28 GiB |     7.59 B | CUDA       |  -1 |         25 |      32 |           pp512 |      2314.24 ± 40.60 |
| falcon-h1 7B Q4_K - Medium     |   4.28 GiB |     7.59 B | CUDA       |  -1 |         25 |      32 |           tg128 |         69.13 ± 0.04 |

### gpus-32t-ncmoe50

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| falcon-h1 7B Q4_K - Medium     |   4.28 GiB |     7.59 B | CUDA       |  -1 |         50 |      32 |           pp512 |      2315.49 ± 27.29 |
| falcon-h1 7B Q4_K - Medium     |   4.28 GiB |     7.59 B | CUDA       |  -1 |         50 |      32 |           tg128 |         69.08 ± 0.06 |

### gpus-ncmoe10

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| falcon-h1 7B Q4_K - Medium     |   4.28 GiB |     7.59 B | CUDA       |  -1 |         10 |           pp512 |      2323.90 ± 17.29 |
| falcon-h1 7B Q4_K - Medium     |   4.28 GiB |     7.59 B | CUDA       |  -1 |         10 |           tg128 |         69.29 ± 0.04 |

### gpus-ncmoe100

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| falcon-h1 7B Q4_K - Medium     |   4.28 GiB |     7.59 B | CUDA       |  -1 |        100 |           pp512 |      2310.76 ± 29.36 |
| falcon-h1 7B Q4_K - Medium     |   4.28 GiB |     7.59 B | CUDA       |  -1 |        100 |           tg128 |         69.21 ± 0.08 |

### gpus-ncmoe25

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| falcon-h1 7B Q4_K - Medium     |   4.28 GiB |     7.59 B | CUDA       |  -1 |         25 |           pp512 |      2319.95 ± 13.04 |
| falcon-h1 7B Q4_K - Medium     |   4.28 GiB |     7.59 B | CUDA       |  -1 |         25 |           tg128 |         69.26 ± 0.08 |

### gpus-ncmoe50

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| falcon-h1 7B Q4_K - Medium     |   4.28 GiB |     7.59 B | CUDA       |  -1 |         50 |           pp512 |      2325.00 ± 28.80 |
| falcon-h1 7B Q4_K - Medium     |   4.28 GiB |     7.59 B | CUDA       |  -1 |         50 |           tg128 |         69.23 ± 0.08 |

## Gemma-4-E4B-Uncensored-HauhauCS-Aggressive-Q2_K_P

### cpu

| model                          |       size |     params | backend    | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | ------: | --------------: | -------------------: |
| gemma4 E4B Q2_K - Medium       |   4.11 GiB |     7.52 B | CPU        |      16 |           pp512 |        189.13 ± 2.57 |
| model                          |       size |     params | backend    | threads |            test |                  t/s |
| model                          |       size |     params | backend    | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | ------: | --------------: | -------------------: |
| gemma4 E4B Q2_K - Medium       |   4.11 GiB |     7.52 B | CPU        |      16 |           pp512 |        188.20 ± 2.07 |
| gemma4 E4B Q2_K - Medium       |   4.11 GiB |     7.52 B | CPU        |      16 |           tg128 |          7.43 ± 0.02 |

### cpu-32t

| model                          |       size |     params | backend    | ngl | threads | dev          |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ------: | ------------ | --------------: | -------------------: |
| gemma4 E4B Q2_K - Medium       |   4.11 GiB |     7.52 B | CUDA       |   0 |      32 | none         |           pp512 |        174.05 ± 7.99 |
| gemma4 E4B Q2_K - Medium       |   4.11 GiB |     7.52 B | CUDA       |   0 |      32 | none         |           tg128 |          6.69 ± 0.12 |

### gpus

| model                          |       size |     params | backend    | ngl |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | --------------: | -------------------: |
| gemma4 E4B Q2_K - Medium       |   4.11 GiB |     7.52 B | CUDA       |  -1 |           pp512 |      3129.93 ± 99.59 |
| gemma4 E4B Q2_K - Medium       |   4.11 GiB |     7.52 B | CUDA       |  -1 |           tg128 |         71.68 ± 0.33 |

### gpus-32t

| model                          |       size |     params | backend    | ngl | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ------: | --------------: | -------------------: |
| gemma4 E4B Q2_K - Medium       |   4.11 GiB |     7.52 B | CUDA       |  -1 |      32 |           pp512 |      3083.13 ± 60.38 |
| gemma4 E4B Q2_K - Medium       |   4.11 GiB |     7.52 B | CUDA       |  -1 |      32 |           tg128 |         71.69 ± 0.17 |

### gpus-32t-ncmoe10

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| gemma4 E4B Q2_K - Medium       |   4.11 GiB |     7.52 B | CUDA       |  -1 |         10 |      32 |           pp512 |     2997.89 ± 259.91 |
| gemma4 E4B Q2_K - Medium       |   4.11 GiB |     7.52 B | CUDA       |  -1 |         10 |      32 |           tg128 |         71.99 ± 0.17 |

### gpus-32t-ncmoe100

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| gemma4 E4B Q2_K - Medium       |   4.11 GiB |     7.52 B | CUDA       |  -1 |        100 |      32 |           pp512 |      3104.73 ± 94.92 |
| gemma4 E4B Q2_K - Medium       |   4.11 GiB |     7.52 B | CUDA       |  -1 |        100 |      32 |           tg128 |         72.35 ± 0.31 |

### gpus-32t-ncmoe25

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| gemma4 E4B Q2_K - Medium       |   4.11 GiB |     7.52 B | CUDA       |  -1 |         25 |      32 |           pp512 |      3080.88 ± 89.83 |
| gemma4 E4B Q2_K - Medium       |   4.11 GiB |     7.52 B | CUDA       |  -1 |         25 |      32 |           tg128 |         72.25 ± 0.34 |

### gpus-32t-ncmoe50

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| gemma4 E4B Q2_K - Medium       |   4.11 GiB |     7.52 B | CUDA       |  -1 |         50 |      32 |           pp512 |      3023.41 ± 33.65 |
| gemma4 E4B Q2_K - Medium       |   4.11 GiB |     7.52 B | CUDA       |  -1 |         50 |      32 |           tg128 |         72.29 ± 0.44 |

### gpus-ncmoe10

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| gemma4 E4B Q2_K - Medium       |   4.11 GiB |     7.52 B | CUDA       |  -1 |         10 |           pp512 |      3124.60 ± 86.60 |
| gemma4 E4B Q2_K - Medium       |   4.11 GiB |     7.52 B | CUDA       |  -1 |         10 |           tg128 |         72.24 ± 0.05 |

### gpus-ncmoe100

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| gemma4 E4B Q2_K - Medium       |   4.11 GiB |     7.52 B | CUDA       |  -1 |        100 |           pp512 |      3087.94 ± 50.27 |
| gemma4 E4B Q2_K - Medium       |   4.11 GiB |     7.52 B | CUDA       |  -1 |        100 |           tg128 |         72.50 ± 0.41 |

### gpus-ncmoe25

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| gemma4 E4B Q2_K - Medium       |   4.11 GiB |     7.52 B | CUDA       |  -1 |         25 |           pp512 |      3114.48 ± 67.95 |
| gemma4 E4B Q2_K - Medium       |   4.11 GiB |     7.52 B | CUDA       |  -1 |         25 |           tg128 |         72.38 ± 0.42 |

### gpus-ncmoe50

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| gemma4 E4B Q2_K - Medium       |   4.11 GiB |     7.52 B | CUDA       |  -1 |         50 |           pp512 |      3075.53 ± 77.73 |
| gemma4 E4B Q2_K - Medium       |   4.11 GiB |     7.52 B | CUDA       |  -1 |         50 |           tg128 |         72.14 ± 0.41 |

## Gemma-4-E4B-Uncensored-HauhauCS-Aggressive-Q4_K_M

### cpu

| model                          |       size |     params | backend    | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | ------: | --------------: | -------------------: |
| gemma4 E4B Q4_K - Medium       |   4.95 GiB |     7.52 B | CPU        |      16 |           pp512 |        187.56 ± 3.37 |
| gemma4 E4B Q4_K - Medium       |   4.95 GiB |     7.52 B | CPU        |      16 |           tg128 |          5.35 ± 0.01 |

### cpu-32t

| model                          |       size |     params | backend    | ngl | threads | dev          |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ------: | ------------ | --------------: | -------------------: |
| gemma4 E4B Q4_K - Medium       |   4.95 GiB |     7.52 B | CUDA       |   0 |      32 | none         |           pp512 |        185.67 ± 9.57 |
| gemma4 E4B Q4_K - Medium       |   4.95 GiB |     7.52 B | CUDA       |   0 |      32 | none         |           tg128 |          4.82 ± 0.04 |

### gpus

| model                          |       size |     params | backend    | ngl |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | --------------: | -------------------: |
| gemma4 E4B Q4_K - Medium       |   4.95 GiB |     7.52 B | CUDA       |  -1 |           pp512 |      3706.67 ± 22.03 |
| gemma4 E4B Q4_K - Medium       |   4.95 GiB |     7.52 B | CUDA       |  -1 |           tg128 |         64.46 ± 0.09 |

### gpus-32t

| model                          |       size |     params | backend    | ngl | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ------: | --------------: | -------------------: |
| gemma4 E4B Q4_K - Medium       |   4.95 GiB |     7.52 B | CUDA       |  -1 |      32 |           pp512 |      3752.93 ± 64.28 |
| gemma4 E4B Q4_K - Medium       |   4.95 GiB |     7.52 B | CUDA       |  -1 |      32 |           tg128 |         64.46 ± 0.23 |

### gpus-32t-ncmoe10

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| gemma4 E4B Q4_K - Medium       |   4.95 GiB |     7.52 B | CUDA       |  -1 |         10 |      32 |           pp512 |      3723.86 ± 80.34 |
| gemma4 E4B Q4_K - Medium       |   4.95 GiB |     7.52 B | CUDA       |  -1 |         10 |      32 |           tg128 |         64.87 ± 0.17 |

### gpus-32t-ncmoe100

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| gemma4 E4B Q4_K - Medium       |   4.95 GiB |     7.52 B | CUDA       |  -1 |        100 |      32 |           pp512 |     3590.83 ± 208.88 |
| gemma4 E4B Q4_K - Medium       |   4.95 GiB |     7.52 B | CUDA       |  -1 |        100 |      32 |           tg128 |         64.62 ± 0.19 |

### gpus-32t-ncmoe25

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| gemma4 E4B Q4_K - Medium       |   4.95 GiB |     7.52 B | CUDA       |  -1 |         25 |      32 |           pp512 |      3744.03 ± 79.27 |
| gemma4 E4B Q4_K - Medium       |   4.95 GiB |     7.52 B | CUDA       |  -1 |         25 |      32 |           tg128 |         64.74 ± 0.24 |

### gpus-32t-ncmoe50

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| gemma4 E4B Q4_K - Medium       |   4.95 GiB |     7.52 B | CUDA       |  -1 |         50 |      32 |           pp512 |     3684.25 ± 104.91 |
| gemma4 E4B Q4_K - Medium       |   4.95 GiB |     7.52 B | CUDA       |  -1 |         50 |      32 |           tg128 |         64.47 ± 0.14 |

### gpus-ncmoe10

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| gemma4 E4B Q4_K - Medium       |   4.95 GiB |     7.52 B | CUDA       |  -1 |         10 |           pp512 |      3738.31 ± 66.95 |
| gemma4 E4B Q4_K - Medium       |   4.95 GiB |     7.52 B | CUDA       |  -1 |         10 |           tg128 |         64.83 ± 0.24 |

### gpus-ncmoe100

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| gemma4 E4B Q4_K - Medium       |   4.95 GiB |     7.52 B | CUDA       |  -1 |        100 |           pp512 |      3679.41 ± 75.01 |
| gemma4 E4B Q4_K - Medium       |   4.95 GiB |     7.52 B | CUDA       |  -1 |        100 |           tg128 |         64.91 ± 0.20 |

### gpus-ncmoe25

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| gemma4 E4B Q4_K - Medium       |   4.95 GiB |     7.52 B | CUDA       |  -1 |         25 |           pp512 |      3678.55 ± 30.72 |
| gemma4 E4B Q4_K - Medium       |   4.95 GiB |     7.52 B | CUDA       |  -1 |         25 |           tg128 |         64.85 ± 0.20 |

### gpus-ncmoe50

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| gemma4 E4B Q4_K - Medium       |   4.95 GiB |     7.52 B | CUDA       |  -1 |         50 |           pp512 |      3689.56 ± 66.83 |
| gemma4 E4B Q4_K - Medium       |   4.95 GiB |     7.52 B | CUDA       |  -1 |         50 |           tg128 |         64.72 ± 0.24 |

## Gemma-4-E4B-Uncensored-HauhauCS-Aggressive-Q6_K_P

### cpu

| model                          |       size |     params | backend    | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | ------: | --------------: | -------------------: |
| gemma4 E4B Q6_K                |   5.81 GiB |     7.52 B | CPU        |      16 |           pp512 |        180.24 ± 1.97 |
| gemma4 E4B Q6_K                |   5.81 GiB |     7.52 B | CPU        |      16 |           tg128 |          4.15 ± 0.00 |

### cpu-32t

| model                          |       size |     params | backend    | ngl | threads | dev          |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ------: | ------------ | --------------: | -------------------: |
| gemma4 E4B Q6_K                |   5.81 GiB |     7.52 B | CUDA       |   0 |      32 | none         |           pp512 |        170.29 ± 7.48 |
| gemma4 E4B Q6_K                |   5.81 GiB |     7.52 B | CUDA       |   0 |      32 | none         |           tg128 |          3.75 ± 0.03 |

### gpus

| model                          |       size |     params | backend    | ngl |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | --------------: | -------------------: |
| gemma4 E4B Q6_K                |   5.81 GiB |     7.52 B | CUDA       |  -1 |           pp512 |     3449.95 ± 106.27 |
| gemma4 E4B Q6_K                |   5.81 GiB |     7.52 B | CUDA       |  -1 |           tg128 |         57.30 ± 0.14 |

### gpus-32t

| model                          |       size |     params | backend    | ngl | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ------: | --------------: | -------------------: |
| gemma4 E4B Q6_K                |   5.81 GiB |     7.52 B | CUDA       |  -1 |      32 |           pp512 |      3458.05 ± 89.46 |
| gemma4 E4B Q6_K                |   5.81 GiB |     7.52 B | CUDA       |  -1 |      32 |           tg128 |         57.24 ± 0.13 |

### gpus-32t-ncmoe10

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| gemma4 E4B Q6_K                |   5.81 GiB |     7.52 B | CUDA       |  -1 |         10 |      32 |           pp512 |      3467.95 ± 97.62 |
| gemma4 E4B Q6_K                |   5.81 GiB |     7.52 B | CUDA       |  -1 |         10 |      32 |           tg128 |         57.57 ± 0.14 |

### gpus-32t-ncmoe100

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| gemma4 E4B Q6_K                |   5.81 GiB |     7.52 B | CUDA       |  -1 |        100 |      32 |           pp512 |      3399.41 ± 34.60 |
| gemma4 E4B Q6_K                |   5.81 GiB |     7.52 B | CUDA       |  -1 |        100 |      32 |           tg128 |         57.44 ± 0.33 |

### gpus-32t-ncmoe25

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| gemma4 E4B Q6_K                |   5.81 GiB |     7.52 B | CUDA       |  -1 |         25 |      32 |           pp512 |     3416.00 ± 101.12 |
| gemma4 E4B Q6_K                |   5.81 GiB |     7.52 B | CUDA       |  -1 |         25 |      32 |           tg128 |         57.58 ± 0.14 |

### gpus-32t-ncmoe50

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| gemma4 E4B Q6_K                |   5.81 GiB |     7.52 B | CUDA       |  -1 |         50 |      32 |           pp512 |      3415.27 ± 25.45 |
| gemma4 E4B Q6_K                |   5.81 GiB |     7.52 B | CUDA       |  -1 |         50 |      32 |           tg128 |         57.52 ± 0.16 |

### gpus-ncmoe10

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| gemma4 E4B Q6_K                |   5.81 GiB |     7.52 B | CUDA       |  -1 |         10 |           pp512 |      3461.16 ± 91.77 |
| gemma4 E4B Q6_K                |   5.81 GiB |     7.52 B | CUDA       |  -1 |         10 |           tg128 |         57.62 ± 0.16 |

### gpus-ncmoe100

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| gemma4 E4B Q6_K                |   5.81 GiB |     7.52 B | CUDA       |  -1 |        100 |           pp512 |      3398.03 ± 57.43 |
| gemma4 E4B Q6_K                |   5.81 GiB |     7.52 B | CUDA       |  -1 |        100 |           tg128 |         57.62 ± 0.13 |

### gpus-ncmoe25

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| gemma4 E4B Q6_K                |   5.81 GiB |     7.52 B | CUDA       |  -1 |         25 |           pp512 |      3468.69 ± 72.08 |
| gemma4 E4B Q6_K                |   5.81 GiB |     7.52 B | CUDA       |  -1 |         25 |           tg128 |         57.48 ± 0.04 |

### gpus-ncmoe50

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| gemma4 E4B Q6_K                |   5.81 GiB |     7.52 B | CUDA       |  -1 |         50 |           pp512 |      3452.46 ± 90.11 |
| gemma4 E4B Q6_K                |   5.81 GiB |     7.52 B | CUDA       |  -1 |         50 |           tg128 |         57.54 ± 0.16 |

## Gemma4-26B-A4B-QAT-Uncensored-HauhauCS-Balanced-Q4_K_M

### cpu

| model                          |       size |     params | backend    | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | ------: | --------------: | -------------------: |
| gemma4 26B.A4B Q4_K - Medium   |  15.63 GiB |    25.23 B | CPU        |      16 |           pp512 |        137.02 ± 1.40 |
| gemma4 26B.A4B Q4_K - Medium   |  15.63 GiB |    25.23 B | CPU        |      16 |           tg128 |          6.00 ± 0.02 |

### cpu-32t

| model                          |       size |     params | backend    | ngl | threads | dev          |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ------: | ------------ | --------------: | -------------------: |
| gemma4 26B.A4B Q4_K - Medium   |  15.63 GiB |    25.23 B | CUDA       |   0 |      32 | none         |           pp512 |        132.60 ± 4.36 |
| gemma4 26B.A4B Q4_K - Medium   |  15.63 GiB |    25.23 B | CUDA       |   0 |      32 | none         |           tg128 |          5.44 ± 0.01 |

### gpus

| model                          |       size |     params | backend    | ngl |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | --------------: | -------------------: |
### gpus-32t

| model                          |       size |     params | backend    | ngl | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ------: | --------------: | -------------------: |
### gpus-32t-ncmoe10

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
### gpus-32t-ncmoe100

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| gemma4 26B.A4B Q4_K - Medium   |  15.63 GiB |    25.23 B | CUDA       |  -1 |        100 |      32 |           pp512 |        247.91 ± 2.72 |
| gemma4 26B.A4B Q4_K - Medium   |  15.63 GiB |    25.23 B | CUDA       |  -1 |        100 |      32 |           tg128 |         12.64 ± 0.19 |

### gpus-32t-ncmoe25

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| gemma4 26B.A4B Q4_K - Medium   |  15.63 GiB |    25.23 B | CUDA       |  -1 |         25 |      32 |           pp512 |        290.92 ± 5.13 |
| gemma4 26B.A4B Q4_K - Medium   |  15.63 GiB |    25.23 B | CUDA       |  -1 |         25 |      32 |           tg128 |         14.99 ± 0.56 |

### gpus-32t-ncmoe50

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| gemma4 26B.A4B Q4_K - Medium   |  15.63 GiB |    25.23 B | CUDA       |  -1 |         50 |      32 |           pp512 |        248.37 ± 3.49 |
| gemma4 26B.A4B Q4_K - Medium   |  15.63 GiB |    25.23 B | CUDA       |  -1 |         50 |      32 |           tg128 |         12.42 ± 0.26 |

### gpus-ncmoe10

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
### gpus-ncmoe100

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| gemma4 26B.A4B Q4_K - Medium   |  15.63 GiB |    25.23 B | CUDA       |  -1 |        100 |           pp512 |        248.43 ± 2.92 |
| gemma4 26B.A4B Q4_K - Medium   |  15.63 GiB |    25.23 B | CUDA       |  -1 |        100 |           tg128 |         14.84 ± 0.05 |

### gpus-ncmoe25

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| gemma4 26B.A4B Q4_K - Medium   |  15.63 GiB |    25.23 B | CUDA       |  -1 |         25 |           pp512 |        291.85 ± 5.29 |
| gemma4 26B.A4B Q4_K - Medium   |  15.63 GiB |    25.23 B | CUDA       |  -1 |         25 |           tg128 |         17.26 ± 0.10 |

### gpus-ncmoe50

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| gemma4 26B.A4B Q4_K - Medium   |  15.63 GiB |    25.23 B | CUDA       |  -1 |         50 |           pp512 |        248.23 ± 4.24 |
| gemma4 26B.A4B Q4_K - Medium   |  15.63 GiB |    25.23 B | CUDA       |  -1 |         50 |           tg128 |         14.65 ± 0.07 |

## MiniCPM-V-4_7-1B-Q8_0

### cpu

| model                          |       size |     params | backend    | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | ------: | --------------: | -------------------: |
| qwen35 0.8B Q8_0               | 1020.97 MiB |     1.01 B | CPU        |      16 |           pp512 |        544.94 ± 0.97 |
| qwen35 0.8B Q8_0               | 1020.97 MiB |     1.01 B | CPU        |      16 |           tg128 |         17.07 ± 0.10 |

### cpu-32t

| model                          |       size |     params | backend    | ngl | threads | dev          |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ------: | ------------ | --------------: | -------------------: |
| qwen35 0.8B Q8_0               | 1020.97 MiB |     1.01 B | CUDA       |   0 |      32 | none         |           pp512 |       507.67 ± 44.63 |
| qwen35 0.8B Q8_0               | 1020.97 MiB |     1.01 B | CUDA       |   0 |      32 | none         |           tg128 |         13.92 ± 0.27 |

### gpus

| model                          |       size |     params | backend    | ngl |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | --------------: | -------------------: |
| qwen35 0.8B Q8_0               | 1020.97 MiB |     1.01 B | CUDA       |  -1 |           pp512 |    16176.98 ± 638.45 |
| qwen35 0.8B Q8_0               | 1020.97 MiB |     1.01 B | CUDA       |  -1 |           tg128 |        249.20 ± 0.29 |

### gpus-32t

| model                          |       size |     params | backend    | ngl | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ------: | --------------: | -------------------: |
| qwen35 0.8B Q8_0               | 1020.97 MiB |     1.01 B | CUDA       |  -1 |      32 |           pp512 |    16252.19 ± 540.68 |
| qwen35 0.8B Q8_0               | 1020.97 MiB |     1.01 B | CUDA       |  -1 |      32 |           tg128 |        247.47 ± 0.21 |

### gpus-32t-ncmoe10

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| qwen35 0.8B Q8_0               | 1020.97 MiB |     1.01 B | CUDA       |  -1 |         10 |      32 |           pp512 |    15890.79 ± 939.86 |
| qwen35 0.8B Q8_0               | 1020.97 MiB |     1.01 B | CUDA       |  -1 |         10 |      32 |           tg128 |        244.87 ± 0.31 |

### gpus-32t-ncmoe100

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| qwen35 0.8B Q8_0               | 1020.97 MiB |     1.01 B | CUDA       |  -1 |        100 |      32 |           pp512 |    15868.55 ± 880.37 |
| qwen35 0.8B Q8_0               | 1020.97 MiB |     1.01 B | CUDA       |  -1 |        100 |      32 |           tg128 |        245.37 ± 0.31 |

### gpus-32t-ncmoe25

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| qwen35 0.8B Q8_0               | 1020.97 MiB |     1.01 B | CUDA       |  -1 |         25 |      32 |           pp512 |    15990.57 ± 788.01 |
| qwen35 0.8B Q8_0               | 1020.97 MiB |     1.01 B | CUDA       |  -1 |         25 |      32 |           tg128 |        244.97 ± 0.26 |

### gpus-32t-ncmoe50

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| qwen35 0.8B Q8_0               | 1020.97 MiB |     1.01 B | CUDA       |  -1 |         50 |      32 |           pp512 |    15941.94 ± 874.26 |
| qwen35 0.8B Q8_0               | 1020.97 MiB |     1.01 B | CUDA       |  -1 |         50 |      32 |           tg128 |        244.23 ± 0.62 |

### gpus-ncmoe10

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| qwen35 0.8B Q8_0               | 1020.97 MiB |     1.01 B | CUDA       |  -1 |         10 |           pp512 |    16007.55 ± 915.40 |
| qwen35 0.8B Q8_0               | 1020.97 MiB |     1.01 B | CUDA       |  -1 |         10 |           tg128 |        246.17 ± 0.04 |

### gpus-ncmoe100

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| qwen35 0.8B Q8_0               | 1020.97 MiB |     1.01 B | CUDA       |  -1 |        100 |           pp512 |    15252.01 ± 800.42 |
| qwen35 0.8B Q8_0               | 1020.97 MiB |     1.01 B | CUDA       |  -1 |        100 |           tg128 |        245.22 ± 0.55 |

### gpus-ncmoe25

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| qwen35 0.8B Q8_0               | 1020.97 MiB |     1.01 B | CUDA       |  -1 |         25 |           pp512 |    16075.68 ± 654.28 |
| qwen35 0.8B Q8_0               | 1020.97 MiB |     1.01 B | CUDA       |  -1 |         25 |           tg128 |        245.96 ± 0.33 |

### gpus-ncmoe50

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| qwen35 0.8B Q8_0               | 1020.97 MiB |     1.01 B | CUDA       |  -1 |         50 |           pp512 |    16060.42 ± 810.89 |
| qwen35 0.8B Q8_0               | 1020.97 MiB |     1.01 B | CUDA       |  -1 |         50 |           tg128 |        245.91 ± 0.21 |

## MiniCPM-V-4_7-35B-A3B-IQ3_XS

### cpu

| model                          |       size |     params | backend    | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | ------: | --------------: | -------------------: |
| qwen35moe 35B.A3B IQ3_XS - 3.3 bpw |  13.48 GiB |    34.66 B | CPU        |      16 |           pp512 |        139.06 ± 0.89 |
| qwen35moe 35B.A3B IQ3_XS - 3.3 bpw |  13.48 GiB |    34.66 B | CPU        |      16 |           tg128 |          7.44 ± 0.02 |

### cpu-32t

| model                          |       size |     params | backend    | ngl | threads | dev          |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ------: | ------------ | --------------: | -------------------: |
| qwen35moe 35B.A3B IQ3_XS - 3.3 bpw |  13.48 GiB |    34.66 B | CUDA       |   0 |      32 | none         |           pp512 |        118.60 ± 4.33 |
| qwen35moe 35B.A3B IQ3_XS - 3.3 bpw |  13.48 GiB |    34.66 B | CUDA       |   0 |      32 | none         |           tg128 |          6.44 ± 0.06 |

### gpus

| model                          |       size |     params | backend    | ngl |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | --------------: | -------------------: |
| qwen35moe 35B.A3B IQ3_XS - 3.3 bpw |  13.48 GiB |    34.66 B | CUDA       |  -1 |           pp512 |      2365.55 ± 25.21 |
| qwen35moe 35B.A3B IQ3_XS - 3.3 bpw |  13.48 GiB |    34.66 B | CUDA       |  -1 |           tg128 |         97.19 ± 0.82 |

### gpus-32t

| model                          |       size |     params | backend    | ngl | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ------: | --------------: | -------------------: |
| qwen35moe 35B.A3B IQ3_XS - 3.3 bpw |  13.48 GiB |    34.66 B | CUDA       |  -1 |      32 |           pp512 |      2381.72 ± 50.20 |
| qwen35moe 35B.A3B IQ3_XS - 3.3 bpw |  13.48 GiB |    34.66 B | CUDA       |  -1 |      32 |           tg128 |         97.13 ± 1.08 |

### gpus-32t-ncmoe10

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| qwen35moe 35B.A3B IQ3_XS - 3.3 bpw |  13.48 GiB |    34.66 B | CUDA       |  -1 |         10 |      32 |           pp512 |       771.66 ± 10.17 |
| qwen35moe 35B.A3B IQ3_XS - 3.3 bpw |  13.48 GiB |    34.66 B | CUDA       |  -1 |         10 |      32 |           tg128 |         49.25 ± 6.53 |

### gpus-32t-ncmoe100

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| qwen35moe 35B.A3B IQ3_XS - 3.3 bpw |  13.48 GiB |    34.66 B | CUDA       |  -1 |        100 |      32 |           pp512 |        323.62 ± 3.90 |
| qwen35moe 35B.A3B IQ3_XS - 3.3 bpw |  13.48 GiB |    34.66 B | CUDA       |  -1 |        100 |      32 |           tg128 |         23.91 ± 1.84 |

### gpus-32t-ncmoe25

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| qwen35moe 35B.A3B IQ3_XS - 3.3 bpw |  13.48 GiB |    34.66 B | CUDA       |  -1 |         25 |      32 |           pp512 |        443.78 ± 5.88 |
| qwen35moe 35B.A3B IQ3_XS - 3.3 bpw |  13.48 GiB |    34.66 B | CUDA       |  -1 |         25 |      32 |           tg128 |         32.09 ± 2.57 |

### gpus-32t-ncmoe50

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| qwen35moe 35B.A3B IQ3_XS - 3.3 bpw |  13.48 GiB |    34.66 B | CUDA       |  -1 |         50 |      32 |           pp512 |        323.31 ± 4.86 |
| qwen35moe 35B.A3B IQ3_XS - 3.3 bpw |  13.48 GiB |    34.66 B | CUDA       |  -1 |         50 |      32 |           tg128 |         22.90 ± 0.90 |

### gpus-ncmoe10

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| qwen35moe 35B.A3B IQ3_XS - 3.3 bpw |  13.48 GiB |    34.66 B | CUDA       |  -1 |         10 |           pp512 |        772.30 ± 9.05 |
| qwen35moe 35B.A3B IQ3_XS - 3.3 bpw |  13.48 GiB |    34.66 B | CUDA       |  -1 |         10 |           tg128 |         63.88 ± 0.68 |

### gpus-ncmoe100

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| qwen35moe 35B.A3B IQ3_XS - 3.3 bpw |  13.48 GiB |    34.66 B | CUDA       |  -1 |        100 |           pp512 |        326.60 ± 4.67 |
| qwen35moe 35B.A3B IQ3_XS - 3.3 bpw |  13.48 GiB |    34.66 B | CUDA       |  -1 |        100 |           tg128 |         28.12 ± 0.33 |

### gpus-ncmoe25

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| qwen35moe 35B.A3B IQ3_XS - 3.3 bpw |  13.48 GiB |    34.66 B | CUDA       |  -1 |         25 |           pp512 |        446.02 ± 6.88 |
| qwen35moe 35B.A3B IQ3_XS - 3.3 bpw |  13.48 GiB |    34.66 B | CUDA       |  -1 |         25 |           tg128 |         37.92 ± 0.86 |

### gpus-ncmoe50

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| qwen35moe 35B.A3B IQ3_XS - 3.3 bpw |  13.48 GiB |    34.66 B | CUDA       |  -1 |         50 |           pp512 |        326.21 ± 5.70 |
| qwen35moe 35B.A3B IQ3_XS - 3.3 bpw |  13.48 GiB |    34.66 B | CUDA       |  -1 |         50 |           tg128 |         27.94 ± 0.41 |

## MiniCPM-V-4_7-35B-A3B-IQ4_XS

### cpu

| model                          |       size |     params | backend    | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | ------: | --------------: | -------------------: |
| qwen35moe 35B.A3B IQ4_XS - 4.25 bpw |  17.43 GiB |    34.66 B | CPU        |      16 |           pp512 |        139.18 ± 1.63 |
| qwen35moe 35B.A3B IQ4_XS - 4.25 bpw |  17.43 GiB |    34.66 B | CPU        |      16 |           tg128 |          6.53 ± 0.02 |

### cpu-32t

| model                          |       size |     params | backend    | ngl | threads | dev          |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ------: | ------------ | --------------: | -------------------: |
| qwen35moe 35B.A3B IQ4_XS - 4.25 bpw |  17.43 GiB |    34.66 B | CUDA       |   0 |      32 | none         |           pp512 |        115.27 ± 2.40 |
| qwen35moe 35B.A3B IQ4_XS - 4.25 bpw |  17.43 GiB |    34.66 B | CUDA       |   0 |      32 | none         |           tg128 |          5.78 ± 0.04 |

### gpus

| model                          |       size |     params | backend    | ngl |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | --------------: | -------------------: |
### gpus-32t

| model                          |       size |     params | backend    | ngl | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ------: | --------------: | -------------------: |
### gpus-32t-ncmoe10

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
### gpus-32t-ncmoe100

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| qwen35moe 35B.A3B IQ4_XS - 4.25 bpw |  17.43 GiB |    34.66 B | CUDA       |  -1 |        100 |      32 |           pp512 |        264.01 ± 4.49 |
| qwen35moe 35B.A3B IQ4_XS - 4.25 bpw |  17.43 GiB |    34.66 B | CUDA       |  -1 |        100 |      32 |           tg128 |         19.62 ± 1.15 |

### gpus-32t-ncmoe25

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
### gpus-32t-ncmoe50

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| qwen35moe 35B.A3B IQ4_XS - 4.25 bpw |  17.43 GiB |    34.66 B | CUDA       |  -1 |         50 |      32 |           pp512 |        263.32 ± 3.71 |
| qwen35moe 35B.A3B IQ4_XS - 4.25 bpw |  17.43 GiB |    34.66 B | CUDA       |  -1 |         50 |      32 |           tg128 |         19.18 ± 0.46 |

### gpus-ncmoe10

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
### gpus-ncmoe100

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| qwen35moe 35B.A3B IQ4_XS - 4.25 bpw |  17.43 GiB |    34.66 B | CUDA       |  -1 |        100 |           pp512 |        264.75 ± 3.55 |
| qwen35moe 35B.A3B IQ4_XS - 4.25 bpw |  17.43 GiB |    34.66 B | CUDA       |  -1 |        100 |           tg128 |         23.10 ± 0.19 |

### gpus-ncmoe25

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
### gpus-ncmoe50

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| qwen35moe 35B.A3B IQ4_XS - 4.25 bpw |  17.43 GiB |    34.66 B | CUDA       |  -1 |         50 |           pp512 |        264.15 ± 3.02 |
| qwen35moe 35B.A3B IQ4_XS - 4.25 bpw |  17.43 GiB |    34.66 B | CUDA       |  -1 |         50 |           tg128 |         23.22 ± 0.16 |

## Qwen3.6-35B-A3B-MTP-UD-IQ3_XXS

### cpu

| model                          |       size |     params | backend    | ngl | dev          |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ------------ | --------------: | -------------------: |
| qwen35moe 35B.A3B IQ3_S - 3.4375 bpw |  13.09 GiB |    35.51 B | CUDA       |   0 | none         |           pp512 |        144.70 ± 2.00 |
| qwen35moe 35B.A3B IQ3_S - 3.4375 bpw |  13.09 GiB |    35.51 B | CUDA       |   0 | none         |           tg128 |          6.10 ± 0.01 |

### cpu-32t

| model                          |       size |     params | backend    | ngl | threads | dev          |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ------: | ------------ | --------------: | -------------------: |
| qwen35moe 35B.A3B IQ3_S - 3.4375 bpw |  13.09 GiB |    35.51 B | CUDA       |   0 |      32 | none         |           pp512 |        119.42 ± 3.29 |
| qwen35moe 35B.A3B IQ3_S - 3.4375 bpw |  13.09 GiB |    35.51 B | CUDA       |   0 |      32 | none         |           tg128 |          5.35 ± 0.01 |

### gpus

| model                          |       size |     params | backend    | ngl |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | --------------: | -------------------: |
| qwen35moe 35B.A3B IQ3_S - 3.4375 bpw |  13.09 GiB |    35.51 B | CUDA       |  -1 |           pp512 |      2247.88 ± 26.70 |
| qwen35moe 35B.A3B IQ3_S - 3.4375 bpw |  13.09 GiB |    35.51 B | CUDA       |  -1 |           tg128 |         96.21 ± 0.09 |

### gpus-32t

| model                          |       size |     params | backend    | ngl | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ------: | --------------: | -------------------: |
| qwen35moe 35B.A3B IQ3_S - 3.4375 bpw |  13.09 GiB |    35.51 B | CUDA       |  -1 |      32 |           pp512 |      2237.30 ± 31.03 |
| qwen35moe 35B.A3B IQ3_S - 3.4375 bpw |  13.09 GiB |    35.51 B | CUDA       |  -1 |      32 |           tg128 |         95.72 ± 0.23 |

### gpus-32t-ncmoe10

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| qwen35moe 35B.A3B IQ3_S - 3.4375 bpw |  13.09 GiB |    35.51 B | CUDA       |  -1 |         10 |      32 |           pp512 |        825.93 ± 6.55 |
| qwen35moe 35B.A3B IQ3_S - 3.4375 bpw |  13.09 GiB |    35.51 B | CUDA       |  -1 |         10 |      32 |           tg128 |         54.45 ± 3.20 |

### gpus-32t-ncmoe100

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| qwen35moe 35B.A3B IQ3_S - 3.4375 bpw |  13.09 GiB |    35.51 B | CUDA       |  -1 |        100 |      32 |           pp512 |        352.26 ± 6.31 |
| qwen35moe 35B.A3B IQ3_S - 3.4375 bpw |  13.09 GiB |    35.51 B | CUDA       |  -1 |        100 |      32 |           tg128 |         25.35 ± 1.21 |

### gpus-32t-ncmoe25

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| qwen35moe 35B.A3B IQ3_S - 3.4375 bpw |  13.09 GiB |    35.51 B | CUDA       |  -1 |         25 |      32 |           pp512 |        478.39 ± 6.54 |
| qwen35moe 35B.A3B IQ3_S - 3.4375 bpw |  13.09 GiB |    35.51 B | CUDA       |  -1 |         25 |      32 |           tg128 |         35.24 ± 2.94 |

### gpus-32t-ncmoe50

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| qwen35moe 35B.A3B IQ3_S - 3.4375 bpw |  13.09 GiB |    35.51 B | CUDA       |  -1 |         50 |      32 |           pp512 |        347.16 ± 5.96 |
| qwen35moe 35B.A3B IQ3_S - 3.4375 bpw |  13.09 GiB |    35.51 B | CUDA       |  -1 |         50 |      32 |           tg128 |         23.43 ± 2.02 |

### gpus-ncmoe10

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| qwen35moe 35B.A3B IQ3_S - 3.4375 bpw |  13.09 GiB |    35.51 B | CUDA       |  -1 |         10 |           pp512 |       826.18 ± 11.73 |
| qwen35moe 35B.A3B IQ3_S - 3.4375 bpw |  13.09 GiB |    35.51 B | CUDA       |  -1 |         10 |           tg128 |         66.41 ± 0.66 |

### gpus-ncmoe100

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| qwen35moe 35B.A3B IQ3_S - 3.4375 bpw |  13.09 GiB |    35.51 B | CUDA       |  -1 |        100 |           pp512 |        353.24 ± 3.85 |
| qwen35moe 35B.A3B IQ3_S - 3.4375 bpw |  13.09 GiB |    35.51 B | CUDA       |  -1 |        100 |           tg128 |         30.44 ± 0.34 |

### gpus-ncmoe25

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| qwen35moe 35B.A3B IQ3_S - 3.4375 bpw |  13.09 GiB |    35.51 B | CUDA       |  -1 |         25 |           pp512 |        479.89 ± 7.37 |
| qwen35moe 35B.A3B IQ3_S - 3.4375 bpw |  13.09 GiB |    35.51 B | CUDA       |  -1 |         25 |           tg128 |         41.13 ± 0.61 |

### gpus-ncmoe50

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| qwen35moe 35B.A3B IQ3_S - 3.4375 bpw |  13.09 GiB |    35.51 B | CUDA       |  -1 |         50 |           pp512 |        352.55 ± 5.23 |
| qwen35moe 35B.A3B IQ3_S - 3.4375 bpw |  13.09 GiB |    35.51 B | CUDA       |  -1 |         50 |           tg128 |         30.56 ± 0.40 |

## Qwen3.6-35B-A3B-MTP-UD-Q4_K_M

### cpu

| model                          |       size |     params | backend    | ngl | dev          |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ------------ | --------------: | -------------------: |
| qwen35moe 35B.A3B Q4_K - Medium |  20.60 GiB |    34.66 B | CUDA       |   0 | none         |           pp512 |        94.84 ± 20.06 |
| qwen35moe 35B.A3B Q4_K - Medium |  20.60 GiB |    34.66 B | CUDA       |   0 | none         |           tg128 |          5.03 ± 0.01 |

### cpu-32t

| model                          |       size |     params | backend    | ngl | threads | dev          |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ------: | ------------ | --------------: | -------------------: |
| qwen35moe 35B.A3B Q4_K - Medium |  20.60 GiB |    34.66 B | CUDA       |   0 |      32 | none         |           pp512 |         75.50 ± 6.64 |
| qwen35moe 35B.A3B Q4_K - Medium |  20.60 GiB |    34.66 B | CUDA       |   0 |      32 | none         |           tg128 |          4.26 ± 0.06 |

### gpus

| model                          |       size |     params | backend    | ngl |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | --------------: | -------------------: |
### gpus-32t

| model                          |       size |     params | backend    | ngl | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ------: | --------------: | -------------------: |
### gpus-32t-ncmoe10

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
### gpus-32t-ncmoe100

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| qwen35moe 35B.A3B Q4_K - Medium |  20.60 GiB |    34.66 B | CUDA       |  -1 |        100 |      32 |           pp512 |        227.00 ± 3.73 |
| qwen35moe 35B.A3B Q4_K - Medium |  20.60 GiB |    34.66 B | CUDA       |  -1 |        100 |      32 |           tg128 |         16.76 ± 0.68 |

### gpus-32t-ncmoe25

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
### gpus-32t-ncmoe50

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| qwen35moe 35B.A3B Q4_K - Medium |  20.60 GiB |    34.66 B | CUDA       |  -1 |         50 |      32 |           pp512 |        225.76 ± 4.37 |
| qwen35moe 35B.A3B Q4_K - Medium |  20.60 GiB |    34.66 B | CUDA       |  -1 |         50 |      32 |           tg128 |         16.68 ± 0.83 |

### gpus-ncmoe10

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
### gpus-ncmoe100

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| qwen35moe 35B.A3B Q4_K - Medium |  20.60 GiB |    34.66 B | CUDA       |  -1 |        100 |           pp512 |        227.38 ± 3.44 |
| qwen35moe 35B.A3B Q4_K - Medium |  20.60 GiB |    34.66 B | CUDA       |  -1 |        100 |           tg128 |         20.13 ± 0.13 |

### gpus-ncmoe25

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
### gpus-ncmoe50

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| qwen35moe 35B.A3B Q4_K - Medium |  20.60 GiB |    34.66 B | CUDA       |  -1 |         50 |           pp512 |        226.61 ± 4.76 |
| qwen35moe 35B.A3B Q4_K - Medium |  20.60 GiB |    34.66 B | CUDA       |  -1 |         50 |           tg128 |         20.40 ± 0.13 |

## Qwen3.6-35B-A3B-UD-IQ3_XXS

### cpu

| model                          |       size |     params | backend    | ngl | dev          |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ------------ | --------------: | -------------------: |
| qwen35moe 35B.A3B IQ3_XXS - 3.0625 bpw |  12.29 GiB |    34.66 B | CUDA       |   0 | none         |           pp512 |        142.64 ± 1.15 |
| qwen35moe 35B.A3B IQ3_XXS - 3.0625 bpw |  12.29 GiB |    34.66 B | CUDA       |   0 | none         |           tg128 |          6.16 ± 0.01 |

### cpu-32t

| model                          |       size |     params | backend    | ngl | threads | dev          |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ------: | ------------ | --------------: | -------------------: |
| qwen35moe 35B.A3B IQ3_XXS - 3.0625 bpw |  12.29 GiB |    34.66 B | CUDA       |   0 |      32 | none         |           pp512 |        127.66 ± 4.61 |
| qwen35moe 35B.A3B IQ3_XXS - 3.0625 bpw |  12.29 GiB |    34.66 B | CUDA       |   0 |      32 | none         |           tg128 |          5.36 ± 0.01 |

### gpus

| model                          |       size |     params | backend    | ngl |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | --------------: | -------------------: |
| qwen35moe 35B.A3B IQ3_XXS - 3.0625 bpw |  12.29 GiB |    34.66 B | CUDA       |  -1 |           pp512 |      2178.74 ± 38.77 |
| qwen35moe 35B.A3B IQ3_XXS - 3.0625 bpw |  12.29 GiB |    34.66 B | CUDA       |  -1 |           tg128 |         93.41 ± 0.75 |

### gpus-32t

| model                          |       size |     params | backend    | ngl | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ------: | --------------: | -------------------: |
| qwen35moe 35B.A3B IQ3_XXS - 3.0625 bpw |  12.29 GiB |    34.66 B | CUDA       |  -1 |      32 |           pp512 |      2146.73 ± 29.93 |
| qwen35moe 35B.A3B IQ3_XXS - 3.0625 bpw |  12.29 GiB |    34.66 B | CUDA       |  -1 |      32 |           tg128 |         92.92 ± 0.79 |

### gpus-32t-ncmoe10

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| qwen35moe 35B.A3B IQ3_XXS - 3.0625 bpw |  12.29 GiB |    34.66 B | CUDA       |  -1 |         10 |      32 |           pp512 |        834.29 ± 7.05 |
| qwen35moe 35B.A3B IQ3_XXS - 3.0625 bpw |  12.29 GiB |    34.66 B | CUDA       |  -1 |         10 |      32 |           tg128 |         50.44 ± 4.95 |

### gpus-32t-ncmoe100

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| qwen35moe 35B.A3B IQ3_XXS - 3.0625 bpw |  12.29 GiB |    34.66 B | CUDA       |  -1 |        100 |      32 |           pp512 |        364.66 ± 3.79 |
| qwen35moe 35B.A3B IQ3_XXS - 3.0625 bpw |  12.29 GiB |    34.66 B | CUDA       |  -1 |        100 |      32 |           tg128 |         25.22 ± 2.04 |

### gpus-32t-ncmoe25

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| qwen35moe 35B.A3B IQ3_XXS - 3.0625 bpw |  12.29 GiB |    34.66 B | CUDA       |  -1 |         25 |      32 |           pp512 |        490.11 ± 5.94 |
| qwen35moe 35B.A3B IQ3_XXS - 3.0625 bpw |  12.29 GiB |    34.66 B | CUDA       |  -1 |         25 |      32 |           tg128 |         33.21 ± 3.03 |

### gpus-32t-ncmoe50

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| qwen35moe 35B.A3B IQ3_XXS - 3.0625 bpw |  12.29 GiB |    34.66 B | CUDA       |  -1 |         50 |      32 |           pp512 |        365.27 ± 4.04 |
| qwen35moe 35B.A3B IQ3_XXS - 3.0625 bpw |  12.29 GiB |    34.66 B | CUDA       |  -1 |         50 |      32 |           tg128 |         23.79 ± 1.07 |

### gpus-ncmoe10

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| qwen35moe 35B.A3B IQ3_XXS - 3.0625 bpw |  12.29 GiB |    34.66 B | CUDA       |  -1 |         10 |           pp512 |       842.16 ± 12.75 |
| qwen35moe 35B.A3B IQ3_XXS - 3.0625 bpw |  12.29 GiB |    34.66 B | CUDA       |  -1 |         10 |           tg128 |         66.84 ± 0.81 |

### gpus-ncmoe100

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| qwen35moe 35B.A3B IQ3_XXS - 3.0625 bpw |  12.29 GiB |    34.66 B | CUDA       |  -1 |        100 |           pp512 |        363.26 ± 5.36 |
| qwen35moe 35B.A3B IQ3_XXS - 3.0625 bpw |  12.29 GiB |    34.66 B | CUDA       |  -1 |        100 |           tg128 |         31.27 ± 0.28 |

### gpus-ncmoe25

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| qwen35moe 35B.A3B IQ3_XXS - 3.0625 bpw |  12.29 GiB |    34.66 B | CUDA       |  -1 |         25 |           pp512 |        496.65 ± 7.58 |
| qwen35moe 35B.A3B IQ3_XXS - 3.0625 bpw |  12.29 GiB |    34.66 B | CUDA       |  -1 |         25 |           tg128 |         41.84 ± 0.90 |

### gpus-ncmoe50

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| qwen35moe 35B.A3B IQ3_XXS - 3.0625 bpw |  12.29 GiB |    34.66 B | CUDA       |  -1 |         50 |           pp512 |        363.82 ± 4.39 |
| qwen35moe 35B.A3B IQ3_XXS - 3.0625 bpw |  12.29 GiB |    34.66 B | CUDA       |  -1 |         50 |           tg128 |         31.33 ± 0.31 |

## Qwen3.6-35B-A3B-UD-Q4_K_M

### cpu

| model                          |       size |     params | backend    | ngl | dev          |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ------------ | --------------: | -------------------: |
| qwen35moe 35B.A3B Q4_K - Medium |  21.10 GiB |    35.51 B | CUDA       |   0 | none         |           pp512 |        109.28 ± 3.42 |
| qwen35moe 35B.A3B Q4_K - Medium |  21.10 GiB |    35.51 B | CUDA       |   0 | none         |           tg128 |          5.02 ± 0.02 |

### cpu-32t

| model                          |       size |     params | backend    | ngl | threads | dev          |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ------: | ------------ | --------------: | -------------------: |
| qwen35moe 35B.A3B Q4_K - Medium |  21.10 GiB |    35.51 B | CUDA       |   0 |      32 | none         |           pp512 |        67.49 ± 25.16 |
| qwen35moe 35B.A3B Q4_K - Medium |  21.10 GiB |    35.51 B | CUDA       |   0 |      32 | none         |           tg128 |          4.02 ± 0.14 |

### gpus

| model                          |       size |     params | backend    | ngl |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | --------------: | -------------------: |
### gpus-32t

| model                          |       size |     params | backend    | ngl | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ------: | --------------: | -------------------: |
### gpus-32t-ncmoe10

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
### gpus-32t-ncmoe100

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| qwen35moe 35B.A3B Q4_K - Medium |  21.10 GiB |    35.51 B | CUDA       |  -1 |        100 |      32 |           pp512 |        226.38 ± 3.67 |
| qwen35moe 35B.A3B Q4_K - Medium |  21.10 GiB |    35.51 B | CUDA       |  -1 |        100 |      32 |           tg128 |         17.20 ± 1.19 |

### gpus-32t-ncmoe25

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
### gpus-32t-ncmoe50

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| qwen35moe 35B.A3B Q4_K - Medium |  21.10 GiB |    35.51 B | CUDA       |  -1 |         50 |      32 |           pp512 |        227.57 ± 4.18 |
| qwen35moe 35B.A3B Q4_K - Medium |  21.10 GiB |    35.51 B | CUDA       |  -1 |         50 |      32 |           tg128 |         16.67 ± 0.80 |

### gpus-ncmoe10

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
### gpus-ncmoe100

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| qwen35moe 35B.A3B Q4_K - Medium |  21.10 GiB |    35.51 B | CUDA       |  -1 |        100 |           pp512 |        228.44 ± 3.00 |
| qwen35moe 35B.A3B Q4_K - Medium |  21.10 GiB |    35.51 B | CUDA       |  -1 |        100 |           tg128 |         20.61 ± 0.17 |

### gpus-ncmoe25

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
### gpus-ncmoe50

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| qwen35moe 35B.A3B Q4_K - Medium |  21.10 GiB |    35.51 B | CUDA       |  -1 |         50 |           pp512 |        226.92 ± 3.87 |
| qwen35moe 35B.A3B Q4_K - Medium |  21.10 GiB |    35.51 B | CUDA       |  -1 |         50 |           tg128 |         20.24 ± 0.23 |

## Qwen3.6-35B-A3B-Uncensored-HauhauCS-Aggressive-Q4_K_M

### cpu

| model                          |       size |     params | backend    | ngl | dev          |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ------------ | --------------: | -------------------: |
| qwen35moe 35B.A3B Q4_K - Medium |  19.70 GiB |    34.66 B | CUDA       |   0 | none         |           pp512 |        134.65 ± 6.00 |
| qwen35moe 35B.A3B Q4_K - Medium |  19.70 GiB |    34.66 B | CUDA       |   0 | none         |           tg128 |          6.26 ± 0.03 |

### cpu-32t

| model                          |       size |     params | backend    | ngl | threads | dev          |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ------: | ------------ | --------------: | -------------------: |
| qwen35moe 35B.A3B Q4_K - Medium |  19.70 GiB |    34.66 B | CUDA       |   0 |      32 | none         |           pp512 |        119.58 ± 6.55 |
| qwen35moe 35B.A3B Q4_K - Medium |  19.70 GiB |    34.66 B | CUDA       |   0 |      32 | none         |           tg128 |          5.41 ± 0.04 |

### gpus

| model                          |       size |     params | backend    | ngl |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | --------------: | -------------------: |
### gpus-32t

| model                          |       size |     params | backend    | ngl | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ------: | --------------: | -------------------: |
### gpus-32t-ncmoe10

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
### gpus-32t-ncmoe100

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| qwen35moe 35B.A3B Q4_K - Medium |  19.70 GiB |    34.66 B | CUDA       |  -1 |        100 |      32 |           pp512 |        226.06 ± 3.07 |
| qwen35moe 35B.A3B Q4_K - Medium |  19.70 GiB |    34.66 B | CUDA       |  -1 |        100 |      32 |           tg128 |         17.49 ± 0.66 |

### gpus-32t-ncmoe25

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
### gpus-32t-ncmoe50

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| qwen35moe 35B.A3B Q4_K - Medium |  19.70 GiB |    34.66 B | CUDA       |  -1 |         50 |      32 |           pp512 |        225.22 ± 4.03 |
| qwen35moe 35B.A3B Q4_K - Medium |  19.70 GiB |    34.66 B | CUDA       |  -1 |         50 |      32 |           tg128 |         17.40 ± 1.10 |

### gpus-ncmoe10

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
### gpus-ncmoe100

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| qwen35moe 35B.A3B Q4_K - Medium |  19.70 GiB |    34.66 B | CUDA       |  -1 |        100 |           pp512 |        224.75 ± 3.32 |
| qwen35moe 35B.A3B Q4_K - Medium |  19.70 GiB |    34.66 B | CUDA       |  -1 |        100 |           tg128 |         21.04 ± 0.10 |

### gpus-ncmoe25

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
### gpus-ncmoe50

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| qwen35moe 35B.A3B Q4_K - Medium |  19.70 GiB |    34.66 B | CUDA       |  -1 |         50 |           pp512 |        225.69 ± 3.82 |
| qwen35moe 35B.A3B Q4_K - Medium |  19.70 GiB |    34.66 B | CUDA       |  -1 |         50 |           tg128 |         20.95 ± 0.13 |

## falcon-mamba-7B-instruct-Q4_K_M

### cpu

| model                          |       size |     params | backend    | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | ------: | --------------: | -------------------: |
| mamba ?B Q4_K - Medium         |   3.91 GiB |     7.27 B | CPU        |      16 |           pp512 |         63.48 ± 0.26 |
| mamba ?B Q4_K - Medium         |   3.91 GiB |     7.27 B | CPU        |      16 |           tg128 |          3.80 ± 0.01 |

### cpu-32t

| model                          |       size |     params | backend    | ngl | threads | dev          |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ------: | ------------ | --------------: | -------------------: |
| mamba ?B Q4_K - Medium         |   3.91 GiB |     7.27 B | CUDA       |   0 |      32 | none         |           pp512 |         77.00 ± 1.48 |
| mamba ?B Q4_K - Medium         |   3.91 GiB |     7.27 B | CUDA       |   0 |      32 | none         |           tg128 |          3.35 ± 0.00 |

### gpus

| model                          |       size |     params | backend    | ngl |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | --------------: | -------------------: |
| mamba ?B Q4_K - Medium         |   3.91 GiB |     7.27 B | CUDA       |  -1 |           pp512 |       1960.59 ± 3.45 |
| mamba ?B Q4_K - Medium         |   3.91 GiB |     7.27 B | CUDA       |  -1 |           tg128 |         75.97 ± 0.04 |

### gpus-32t

| model                          |       size |     params | backend    | ngl | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ------: | --------------: | -------------------: |
| mamba ?B Q4_K - Medium         |   3.91 GiB |     7.27 B | CUDA       |  -1 |      32 |           pp512 |      1955.10 ± 12.83 |
| mamba ?B Q4_K - Medium         |   3.91 GiB |     7.27 B | CUDA       |  -1 |      32 |           tg128 |         75.79 ± 0.06 |

### gpus-32t-ncmoe10

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| mamba ?B Q4_K - Medium         |   3.91 GiB |     7.27 B | CUDA       |  -1 |         10 |      32 |           pp512 |      1943.68 ± 33.20 |
| mamba ?B Q4_K - Medium         |   3.91 GiB |     7.27 B | CUDA       |  -1 |         10 |      32 |           tg128 |         75.60 ± 0.16 |

### gpus-32t-ncmoe100

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| mamba ?B Q4_K - Medium         |   3.91 GiB |     7.27 B | CUDA       |  -1 |        100 |      32 |           pp512 |      1961.47 ± 20.08 |
| mamba ?B Q4_K - Medium         |   3.91 GiB |     7.27 B | CUDA       |  -1 |        100 |      32 |           tg128 |         75.78 ± 0.04 |

### gpus-32t-ncmoe25

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| mamba ?B Q4_K - Medium         |   3.91 GiB |     7.27 B | CUDA       |  -1 |         25 |      32 |           pp512 |      1960.98 ± 18.44 |
| mamba ?B Q4_K - Medium         |   3.91 GiB |     7.27 B | CUDA       |  -1 |         25 |      32 |           tg128 |         75.69 ± 0.03 |

### gpus-32t-ncmoe50

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| mamba ?B Q4_K - Medium         |   3.91 GiB |     7.27 B | CUDA       |  -1 |         50 |      32 |           pp512 |      1971.92 ± 16.93 |
| mamba ?B Q4_K - Medium         |   3.91 GiB |     7.27 B | CUDA       |  -1 |         50 |      32 |           tg128 |         75.74 ± 0.06 |

### gpus-ncmoe10

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| mamba ?B Q4_K - Medium         |   3.91 GiB |     7.27 B | CUDA       |  -1 |         10 |           pp512 |      1956.89 ± 19.67 |
| mamba ?B Q4_K - Medium         |   3.91 GiB |     7.27 B | CUDA       |  -1 |         10 |           tg128 |         75.75 ± 0.02 |

### gpus-ncmoe100

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| mamba ?B Q4_K - Medium         |   3.91 GiB |     7.27 B | CUDA       |  -1 |        100 |           pp512 |      1958.44 ± 21.40 |
| mamba ?B Q4_K - Medium         |   3.91 GiB |     7.27 B | CUDA       |  -1 |        100 |           tg128 |         75.89 ± 0.02 |

### gpus-ncmoe25

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| mamba ?B Q4_K - Medium         |   3.91 GiB |     7.27 B | CUDA       |  -1 |         25 |           pp512 |      1962.15 ± 18.25 |
| mamba ?B Q4_K - Medium         |   3.91 GiB |     7.27 B | CUDA       |  -1 |         25 |           tg128 |         75.74 ± 0.02 |

### gpus-ncmoe50

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| mamba ?B Q4_K - Medium         |   3.91 GiB |     7.27 B | CUDA       |  -1 |         50 |           pp512 |      1967.00 ± 37.01 |
| mamba ?B Q4_K - Medium         |   3.91 GiB |     7.27 B | CUDA       |  -1 |         50 |           tg128 |         75.93 ± 0.05 |

## rnj-1-instruct-Q4_K_M

### cpu

| model                          |       size |     params | backend    | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | ------: | --------------: | -------------------: |
| gemma3 8B Q4_K - Medium        |   4.76 GiB |     8.31 B | CPU        |      16 |           pp512 |        108.18 ± 1.37 |
| gemma3 8B Q4_K - Medium        |   4.76 GiB |     8.31 B | CPU        |      16 |           tg128 |          3.21 ± 0.00 |

### cpu-32t

| model                          |       size |     params | backend    | ngl | threads | dev          |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ------: | ------------ | --------------: | -------------------: |
| gemma3 8B Q4_K - Medium        |   4.76 GiB |     8.31 B | CUDA       |   0 |      32 | none         |           pp512 |        110.92 ± 2.02 |
| gemma3 8B Q4_K - Medium        |   4.76 GiB |     8.31 B | CUDA       |   0 |      32 | none         |           tg128 |          2.92 ± 0.02 |

### gpus

| model                          |       size |     params | backend    | ngl |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | --------------: | -------------------: |
| gemma3 8B Q4_K - Medium        |   4.76 GiB |     8.31 B | CUDA       |  -1 |           pp512 |      2539.96 ± 44.25 |
| gemma3 8B Q4_K - Medium        |   4.76 GiB |     8.31 B | CUDA       |  -1 |           tg128 |         71.26 ± 0.01 |

### gpus-32t

| model                          |       size |     params | backend    | ngl | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ------: | --------------: | -------------------: |
| gemma3 8B Q4_K - Medium        |   4.76 GiB |     8.31 B | CUDA       |  -1 |      32 |           pp512 |      2520.87 ± 47.45 |
| gemma3 8B Q4_K - Medium        |   4.76 GiB |     8.31 B | CUDA       |  -1 |      32 |           tg128 |         71.15 ± 0.05 |

### gpus-32t-ncmoe10

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| gemma3 8B Q4_K - Medium        |   4.76 GiB |     8.31 B | CUDA       |  -1 |         10 |      32 |           pp512 |      2541.82 ± 50.57 |
| gemma3 8B Q4_K - Medium        |   4.76 GiB |     8.31 B | CUDA       |  -1 |         10 |      32 |           tg128 |         70.96 ± 0.04 |

### gpus-32t-ncmoe100

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| gemma3 8B Q4_K - Medium        |   4.76 GiB |     8.31 B | CUDA       |  -1 |        100 |      32 |           pp512 |      2505.25 ± 40.48 |
| gemma3 8B Q4_K - Medium        |   4.76 GiB |     8.31 B | CUDA       |  -1 |        100 |      32 |           tg128 |         71.01 ± 0.02 |

### gpus-32t-ncmoe25

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| gemma3 8B Q4_K - Medium        |   4.76 GiB |     8.31 B | CUDA       |  -1 |         25 |      32 |           pp512 |      2527.12 ± 55.16 |
| gemma3 8B Q4_K - Medium        |   4.76 GiB |     8.31 B | CUDA       |  -1 |         25 |      32 |           tg128 |         70.92 ± 0.07 |

### gpus-32t-ncmoe50

| model                          |       size |     params | backend    | ngl |  n_cpu_moe | threads |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | ------: | --------------: | -------------------: |
| gemma3 8B Q4_K - Medium        |   4.76 GiB |     8.31 B | CUDA       |  -1 |         50 |      32 |           pp512 |      2544.82 ± 56.01 |
| gemma3 8B Q4_K - Medium        |   4.76 GiB |     8.31 B | CUDA       |  -1 |         50 |      32 |           tg128 |         70.99 ± 0.03 |

### gpus-ncmoe10

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| gemma3 8B Q4_K - Medium        |   4.76 GiB |     8.31 B | CUDA       |  -1 |         10 |           pp512 |      2541.31 ± 52.94 |
| gemma3 8B Q4_K - Medium        |   4.76 GiB |     8.31 B | CUDA       |  -1 |         10 |           tg128 |         71.07 ± 0.02 |

### gpus-ncmoe100

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| gemma3 8B Q4_K - Medium        |   4.76 GiB |     8.31 B | CUDA       |  -1 |        100 |           pp512 |      2540.85 ± 61.48 |
| gemma3 8B Q4_K - Medium        |   4.76 GiB |     8.31 B | CUDA       |  -1 |        100 |           tg128 |         71.05 ± 0.04 |

### gpus-ncmoe25

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| gemma3 8B Q4_K - Medium        |   4.76 GiB |     8.31 B | CUDA       |  -1 |         25 |           pp512 |      2515.62 ± 40.36 |
| gemma3 8B Q4_K - Medium        |   4.76 GiB |     8.31 B | CUDA       |  -1 |         25 |           tg128 |         71.07 ± 0.02 |

### gpus-ncmoe50

| model                          |       size |     params | backend    | ngl |  n_cpu_moe |            test |                  t/s |
| ------------------------------ | ---------: | ---------: | ---------- | --: | ---------: | --------------: | -------------------: |
| gemma3 8B Q4_K - Medium        |   4.76 GiB |     8.31 B | CUDA       |  -1 |         50 |           pp512 |      2560.36 ± 21.02 |
| gemma3 8B Q4_K - Medium        |   4.76 GiB |     8.31 B | CUDA       |  -1 |         50 |           tg128 |         71.06 ± 0.04 |

</details>