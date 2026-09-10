---
name: giapura-repo-concurrent-commits
description: Otro proceso commitea y pushea automáticamente en el repo giapura-erp mientras trabajás
metadata: 
  node_type: memory
  type: project
  originSessionId: 42b4f4d5-19f1-4791-a98d-3c98ae8cce59
---

En el repo `giapura-erp` hay otro proceso (probablemente una sesión de Claude en paralelo) que commitea el working tree entero y lo pushea a `origin/master` sin que se lo pidan. El 2026-07-10 el commit `02ef801` mezcló una feature ajena, mi feature a medio verificar y dos scripts temporales míos, todo bajo un mensaje que solo describía la feature ajena.

**Why:** Cualquier archivo suelto en el working tree —incluidos scratch files— puede terminar commiteado y pusheado antes de que lo borres.

**How to apply:** Escribir archivos temporales en el scratchpad de la sesión, nunca en la raíz del repo. Antes de cerrar, revisar `git log --oneline -3` para detectar commits que no hiciste vos.
