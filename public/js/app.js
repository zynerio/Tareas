/* --- Funcionalidad añadida: Drag & Drop, Etiquetas, Compartir --- */

// Variables globales de estado
var isEditMode = false;
var collapseKey = null;

// Helper para leer estado colapsado
function readCollapsedSet() {
    try {
        if (!collapseKey) return new Set();
        var raw = localStorage.getItem(collapseKey);
        var arr = raw ? JSON.parse(raw) : [];
        return new Set(Array.isArray(arr) ? arr : []);
    } catch (_) {
        return new Set();
    }
}

// Helper para escribir estado colapsado
function writeCollapsedSet(set) {
    try {
        if (!collapseKey) return;
        localStorage.setItem(collapseKey, JSON.stringify(Array.from(set)));
    } catch (_) {}
}

function getTaskIndexFromCard(card) {
    // 1. Preferir el input de orden actualizado
    var orderInput = card ? card.querySelector('.task-order') : null;
    if (orderInput && orderInput.value !== '') {
        return parseInt(orderInput.value, 10);
    }
    // 2. Fallback al atributo name
    var inp = card ? card.querySelector('input[name*="[nombre]"]') : null;
    var nm = inp ? String(inp.getAttribute('name') || '') : '';
    var m = nm.match(/tasks\[(\d+)\]\[nombre\]/i);
    if (m) return parseInt(m[1], 10);
    
    // 3. Fallback al índice DOM
    if (card && card.parentNode) {
        var children = Array.prototype.slice.call(card.parentNode.children);
        return children.indexOf(card);
    }
    return -1;
}

/**
 * Añade event listeners para Drag & Drop nativo
 */
function addDragListeners(item) {
    if (!item) return;
    
    // Inicialmente no draggable para permitir selección de texto
    item.setAttribute('draggable', 'false');

    // Activar draggable solo al pulsar sobre el handle
    item.addEventListener('mousedown', function(e) {
        if (e.target.classList.contains('drag-handle')) {
            item.setAttribute('draggable', 'true');
        } else {
            item.setAttribute('draggable', 'false');
        }
    });

    item.addEventListener('dragstart', function(e) {
        this.classList.add('dragging');
        document.getElementById('tasks-container').classList.add('dragging-active'); // Activar modo arrastre
        e.dataTransfer.effectAllowed = 'move';
        // Hack para Firefox
        e.dataTransfer.setData('text/html', this.innerHTML);
    });
    item.addEventListener('dragend', function(e) {
        this.classList.remove('dragging');
        item.setAttribute('draggable', 'false'); // Reset
        document.getElementById('tasks-container').classList.remove('dragging-active'); // Desactivar modo arrastre
        
        // Limpiar cualquier clase 'over' residual
        document.querySelectorAll('.task-item.over').forEach(function(el) {
            el.classList.remove('over');
        });
        
        updateTaskOrders();
    });
    item.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        return false;
    });
    item.addEventListener('dragenter', function(e) {
        this.classList.add('over');
    });
    item.addEventListener('dragleave', function(e) {
        this.classList.remove('over');
    });
    item.addEventListener('drop', function(e) {
        e.stopPropagation(); // stops the browser from redirecting.
        this.classList.remove('over');
        
        var dragSrcEl = document.querySelector('.task-item.dragging');
        if (dragSrcEl !== this) {
            // Intercambiar elementos en el DOM
            // Determinar si insertar antes o después
            var container = document.getElementById('tasks-container');
            var siblings = Array.prototype.slice.call(container.children);
            var srcIdx = siblings.indexOf(dragSrcEl);
            var targetIdx = siblings.indexOf(this);
            
            if (srcIdx < targetIdx) {
                this.parentNode.insertBefore(dragSrcEl, this.nextSibling);
            } else {
                this.parentNode.insertBefore(dragSrcEl, this);
            }
        }
        return false;
    });
}

/**
 * Actualiza los inputs ocultos de orden y sincroniza el estado colapsado
 */
function updateTaskOrders() {
    var items = document.querySelectorAll('#tasks-container .task-item');
    var newCollapsedSet = new Set();

    items.forEach(function(item, index) {
        var input = item.querySelector('.task-order');
        if (input) {
            input.value = index;
        }
        // Sincronizar estado colapsado con el nuevo orden visual
        if (item.classList.contains('collapsed')) {
            newCollapsedSet.add(index);
        }
    });

    // Guardar el estado actualizado si estamos en modo edición
    if (typeof writeCollapsedSet === 'function' && typeof isEditMode !== 'undefined' && isEditMode) {
        writeCollapsedSet(newCollapsedSet);
    }
}

/**
 * Añade una etiqueta a una tarea
 */
function addTag(e, taskIndex, tagId, tagName, tagColor) {
    if(e) e.preventDefault();
    var container = document.getElementById('tags-container-' + taskIndex);
    if (!container) return;
    
    // Verificar si ya existe
    var existing = container.querySelectorAll('input[value="' + tagId + '"]');
    if (existing.length > 0) return;
    
    var span = document.createElement('span');
    span.className = 'badge tag-badge me-1';
    span.style.backgroundColor = tagColor;
    span.innerHTML = tagName + 
        '<input type="hidden" name="tasks[' + taskIndex + '][etiquetas][]" value="' + tagId + '">' +
        '<i class="fa-solid fa-times remove-tag ms-1" style="cursor:pointer;" onclick="removeTag(this)"></i>';
    
    container.appendChild(span);
}

/**
 * Elimina una etiqueta
 */
function removeTag(icon) {
    var badge = icon.closest('.tag-badge');
    if (badge) {
        badge.parentNode.removeChild(badge);
    }
}

/* --- Fin Funcionalidad añadida --- */

/**
 * Construye el dropdown de etiquetas
 */
function buildTagDropdown(index) {
    if (typeof AVAILABLE_TAGS === 'undefined' || !AVAILABLE_TAGS.length) return '';
    var html = '<div class="dropdown mt-1">' +
        '<button class="btn btn-sm btn-outline-secondary dropdown-toggle py-0" type="button" data-bs-toggle="dropdown" aria-expanded="false">' +
        '<i class="fa-solid fa-tag me-1"></i> Añadir etiqueta' +
        '</button>' +
        '<ul class="dropdown-menu">';
    AVAILABLE_TAGS.forEach(function(tag) {
        var safeName = (tag.nombre || '').replace(/'/g, "\\'");
        html += '<li><a class="dropdown-item" href="#" onclick="addTag(event, ' + index + ', \'' + tag.id + '\', \'' + safeName + '\', \'' + tag.color + '\')">' +
            '<span class="badge me-1" style="background-color:' + tag.color + '">&nbsp;</span>' +
            (tag.nombre || '') +
            '</a></li>';
    });
    html += '</ul></div>';
    return html;
}

function addTask() {
  var container = document.getElementById('tasks-container');
  var index = container.querySelectorAll('.task-item').length;
  var isEdit = (container && container.getAttribute('data-edit') === '1');
  var card = document.createElement('div');
  card.className = 'card mb-2 task-item';
  
  // Added: draggable
  addDragListeners(card);

  card.innerHTML = '' +
    '<div class="card-body">' +
    '<div class="task-header d-flex align-items-center justify-content-between">' +
      '<div class="d-flex align-items-center gap-2 flex-grow-1">' +
        '<i class="fa-solid fa-grip-vertical text-muted drag-handle" style="cursor: grab;"></i>' +
        '<div class="form-check header-select">' +
          '<input class="form-check-input task-select" type="checkbox">' +
          '<label class="form-check-label small">Seleccionar</label>' +
        '</div>' +
        // Added: order input
        '<input type="hidden" class="task-order" name="tasks[' + index + '][orden]" value="' + index + '">' +
        '<input type="text" class="form-control form-control-sm task-title-input" name="tasks[' + index + '][nombre]" placeholder="Nombre de la tarea" required>' +
      '</div>' +
      '<i class="fa-solid fa-chevron-down ms-2"></i>' +
    '</div>' +
    '<div class="task-content mt-2">' +
      '<div class="mb-2"><textarea class="form-control task-desc" name="tasks[' + index + '][descripcion]" rows="3" placeholder="Descripción"></textarea></div>' +
      '<div class="form-check mt-2"><input class="form-check-input" type="checkbox" name="tasks[' + index + '][completada]"><label class="form-check-label">Completada</label></div>' +
      '<div class="mt-2"><textarea class="form-control" name="tasks[' + index + '][notas]" rows="2" placeholder="Notas"></textarea></div>' +
      // Added: Tags container
      '<div class="mt-2" id="tags-container-' + index + '"></div>' +
      buildTagDropdown(index) +
      '<div class="mt-2"><button type="button" class="btn btn-sm btn-outline-secondary" onclick="addSubtask(this)"><i class="fa-solid fa-plus me-1"></i> Añadir subtarea</button></div>' +
      '<div class="mt-2 subtasks-container"></div>' +
      '<div class="mt-2 text-end"><button type="button" class="btn btn-sm btn-outline-danger btn-remove-task"><i class="fa-solid fa-trash me-1"></i> Borrar tarea</button></div>' +
    '</div>' +
    '</div>';
  container.appendChild(card);
  var ti = card.querySelector('.task-title-input');
  if (ti) { try { ti.focus(); ti.select(); } catch (_) {} }
  updateTaskOrders();
}

function addSubtask(btn) {
  var card = btn.closest('.card');
  var tasksContainer = document.getElementById('tasks-container');
  // Use getTaskIndexFromCard logic or indexOf, but here we need index for name attribute
  // The original code used indexOf, which might be risky if we rely on name index matching DOM index.
  // But for subtasks, it just needs A index.
  // Let's stick to original implementation but be aware.
  var taskIndex = Array.prototype.indexOf.call(tasksContainer.children, card);
  
  // Wait, if tasks are reordered, indexOf changes.
  // If I add a subtask to task at DOM index 0, it gets name="tasks[0][subtareas]..."
  // If that task was originally tasks[5], mixing indices might be confusing but PHP handles array keys.
  // As long as keys are unique per submission, it's fine.
  
  var subtasksContainer = card.querySelector('.subtasks-container');
  var subIndex = subtasksContainer.querySelectorAll('.subtask-item').length;
  var row = document.createElement('div');
  row.className = 'row g-2 align-items-center subtask-item';
  row.innerHTML = '' +
    '<div class="col-md-6"><input type="text" class="form-control" name="tasks[' + taskIndex + '][subtareas][' + subIndex + '][nombre]" placeholder="Nombre de la subtarea" required></div>' +
    '<div class="col-md-3 form-check"><input class="form-check-input" type="checkbox" name="tasks[' + taskIndex + '][subtareas][' + subIndex + '][completada]"><label class="form-check-label">Completada</label></div>' +
    '<div class="col-md-3 text-end"><button type="button" class="btn btn-sm btn-outline-danger btn-remove-subtask"><i class="fa-solid fa-trash me-1"></i> Borrar subtarea</button></div>';
  subtasksContainer.appendChild(row);
}

document.addEventListener('DOMContentLoaded', function () {
  
  // --- Initialize Drag & Drop for existing tasks ---
  var tasks = document.querySelectorAll('#tasks-container .task-item');
  tasks.forEach(function(t) {
      addDragListeners(t);
  });
  
  // --- Share Modal Logic ---
  var btnSaveShare = document.getElementById('btn-save-share');
    if (btnSaveShare) {
        btnSaveShare.addEventListener('click', function() {
            var form = document.getElementById('shareForm');
            var modalEl = document.getElementById('shareModal');
            var modal = bootstrap.Modal.getInstance(modalEl);
            
            var formData = new FormData(form);
            
            var users = [];
            form.querySelectorAll('input[name="users[]"]:checked').forEach(function(cb) {
                users.push(cb.value);
            });
            
            fetch('index.php?route=/proyectos/compartir', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: 'id=' + encodeURIComponent(formData.get('id')) + 
                      users.map(function(u) { return '&users[]=' + encodeURIComponent(u); }).join('')
            })
            .then(function(response) { return response.json(); })
            .then(function(data) {
                if (data.ok) {
                    showInlineAlert('#tasks-container', 'success', 'Usuarios actualizados correctamente');
                    if (modal) modal.hide();
                } else {
                    alert('Error: ' + (data.error || 'Desconocido'));
                }
            })
            .catch(function(err) {
                console.error(err);
                alert('Error de conexión');
            });
        });
    }

  // --- Original DOMContentLoaded Logic ---

  var backBtn = document.getElementById('backToTop');
  if (backBtn) {
    backBtn.addEventListener('click', function () {
      try {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (_) {
        window.scrollTo(0, 0);
      }
    });
    var syncBackBtn = function () {
      var show = (window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0) >= 300;
      backBtn.classList.toggle('hidden', !show);
    };
    syncBackBtn();
    window.addEventListener('scroll', syncBackBtn, { passive: true });
  }
  var flashes = document.querySelectorAll('.alert.message-bar');
  flashes.forEach(function (flash) {
    var autoHide = flash.classList.contains('alert-success') ||
                   flash.classList.contains('alert-info') ||
                   flash.classList.contains('alert-warning') ||
                   flash.classList.contains('alert-danger');
    if (autoHide) {
      setTimeout(function () {
        flash.classList.add('fade');
        setTimeout(function () {
          if (flash && flash.parentNode) flash.parentNode.removeChild(flash);
        }, 300);
      }, 4000);
    }
  });
  var inlineBadges = document.querySelectorAll('.js-auto-hide-badge');
  inlineBadges.forEach(function (badge) {
    setTimeout(function () {
      badge.classList.add('fade');
      setTimeout(function () {
        if (badge && badge.parentNode) badge.parentNode.removeChild(badge);
      }, 300);
    }, 4000);
  });
  function parseTxtToTasks(text) {
    var lines = text.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(function (l) { return l.length > 0; });
    var tasks = [];
    var current = null;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      
      // Check for "Description,Yes/No" format
      var commaMatch = line.match(/^(.*),\s*(Sí|Si|No)\s*$/i);
      if (commaMatch) {
        var desc = commaMatch[1].trim();
        var yesNo = commaMatch[2].toLowerCase();
        var isCompleted = (yesNo === 'sí' || yesNo === 'si');
        current = { nombre: desc, descripcion: '', completada: isCompleted, notas: '', subtareas: [] };
        tasks.push(current);
        continue;
      }

      var headingMatch = line.match(/^\s*(\d+)\s*-\s*(.+)$/i);
      var bulletMatch = line.match(/^\s*-\s*(.+)$/);
      if (line.toLowerCase().indexOf('tarea:') === 0) {
        var name = line.substring('Tarea:'.length).trim();
        if (!name) throw new Error('Formato inválido');
        current = { nombre: name, descripcion: '', completada: false, notas: '', subtareas: [] };
        tasks.push(current);
        continue;
      }
      if (headingMatch) {
        var num = headingMatch[1];
        var content = headingMatch[2] || '';
        var title = content;
        var rest = '';
        var idxColon = content.indexOf(':');
        if (idxColon !== -1) {
          title = content.substring(0, idxColon).trim();
          rest = content.substring(idxColon + 1).trim();
          if (!rest) {
            var splitY2 = title.split(/\s+y\s+/i);
            if (splitY2.length >= 2) {
              title = splitY2[0].trim();
              rest = splitY2.slice(1).join(' y ').trim();
            }
          }
        } else {
          var splitY = content.split(/\s+y\s+/i);
          if (splitY.length >= 2) {
            title = splitY[0].trim();
            rest = splitY.slice(1).join(' y ').trim();
          } else {
            title = content.trim();
            rest = '';
          }
        }
        current = { nombre: (num + '- ' + title).trim(), descripcion: rest ? rest.trim() : '', completada: false, notas: '', subtareas: [] };
        tasks.push(current);
        continue;
      }
      if (bulletMatch) {
        if (!current) throw new Error('Línea no reconocida');
        var b = bulletMatch[1];
        current.descripcion = (current.descripcion ? current.descripcion + '\n' : '') + b;
        continue;
      }
      if (line.toLowerCase().indexOf('subtarea:') === 0) {
        if (!current) throw new Error('Subtarea sin tarea');
        var sname = line.substring('Subtarea:'.length).trim();
        current.subtareas.push({ nombre: sname, completada: false });
        continue;
      }
      if (line.toLowerCase().indexOf('notas:') === 0) {
        if (!current) throw new Error('Notas sin tarea');
        var n = line.substring('Notas:'.length).trim();
        current.notas = current.notas ? (current.notas + '\n' + n) : n;
        continue;
      }
      if (line.toLowerCase().indexOf('descripcion:') === 0 || line.toLowerCase().indexOf('descripción:') === 0) {
        if (!current) throw new Error('Formato inválido');
        var d = line.split(':').slice(1).join(':').trim();
        current.descripcion = (current.descripcion ? current.descripcion + '\n' : '') + d;
        continue;
      }

      // Fallback: Treat as a task with "Name,Status" or just "Name"
      var lastComma = line.lastIndexOf(',');
      if (lastComma !== -1) {
          var possibleStatus = line.substring(lastComma + 1).trim().toLowerCase();
          var possibleName = line.substring(0, lastComma).trim();
          if (['si', 'sí', 'no'].indexOf(possibleStatus) !== -1) {
              var isCompleted = (possibleStatus === 'si' || possibleStatus === 'sí');
              current = { nombre: possibleName, descripcion: '', completada: isCompleted, notas: '', subtareas: [] };
              tasks.push(current);
              continue;
          }
      }
      
      // If no status found or comma format not matched, treat whole line as task name
      current = { nombre: line, descripcion: '', completada: false, notas: '', subtareas: [] };
      tasks.push(current);
    }
    if (!tasks.length) throw new Error('Sin tareas');
    return tasks;
  }
  function renderImportedTasks(tasks) {
    var container = document.getElementById('tasks-container');
    if (!container) return;
    var isEdit = (container.getAttribute('data-edit') === '1');
    container.innerHTML = '';
    tasks.forEach(function (t, idx) {
      var card = document.createElement('div');
      card.className = 'card mb-2 task-item';
      
      // Added: draggable
      addDragListeners(card);
      
      var html = '' +
        '<div class="card-body">' +
        '<div class="task-header d-flex align-items-center justify-content-between">' +
          '<div class="d-flex align-items-center gap-2 flex-grow-1">' +
            '<div class="form-check header-select">' +
              '<input class="form-check-input task-select" type="checkbox">' +
              '<label class="form-check-label small">Seleccionar</label>' +
            '</div>' +
            // Added: order input
            '<input type="hidden" class="task-order" name="tasks[' + idx + '][orden]" value="' + idx + '">' +
            '<input type="text" class="form-control form-control-sm task-title-input" name="tasks[' + idx + '][nombre]" placeholder="Nombre de la tarea" value="' + (t.nombre || '') + '">' +
          '</div>' +
          '<i class="fa-solid fa-chevron-down ms-2"></i>' +
        '</div>' +
        '<div class="task-content mt-2">' +
        '<div class="mb-2"><textarea class="form-control task-desc" name="tasks[' + idx + '][descripcion]" rows="3" placeholder="Descripción">' + (t.descripcion || '') + '</textarea></div>' +
        '<div class="form-check mt-2"><input class="form-check-input" type="checkbox" name="tasks[' + idx + '][completada]"' + (t.completada ? ' checked' : '') + '><label class="form-check-label">Completada</label></div>' +
        '<div class="mt-2"><textarea class="form-control" name="tasks[' + idx + '][notas]" rows="2" placeholder="Notas">' + (t.notas || '') + '</textarea></div>' +
        // Added: Tags container
        '<div class="mt-2" id="tags-container-' + idx + '"></div>' +
        buildTagDropdown(idx) +
        '<div class="mt-2"><button type="button" class="btn btn-sm btn-outline-secondary" onclick="addSubtask(this)"><i class="fa-solid fa-plus me-1"></i> Añadir subtarea</button></div>' +
        '<div class="mt-2 subtasks-container">';
      (t.subtareas || []).forEach(function (s, si) {
        html += '<div class="row g-2 align-items-center subtask-item">' +
          '<div class="col-md-6"><input type="text" class="form-control" name="tasks[' + idx + '][subtareas][' + si + '][nombre]" placeholder="Nombre de la subtarea" value="' + (s.nombre || '') + '"></div>' +
          '<div class="col-md-3 form-check"><input class="form-check-input" type="checkbox" name="tasks[' + idx + '][subtareas][' + si + '][completada]"><label class="form-check-label">Completada</label></div>' +
          '</div>';
      });
      html += '</div><div class="mt-2 text-end"><button type="button" class="btn btn-sm btn-outline-danger btn-remove-task"><i class="fa-solid fa-trash me-1"></i> Borrar tarea</button></div></div>';
      card.innerHTML = html;
      container.appendChild(card);
    });
    updateTaskOrders();
  }
  function appendTasksToDOM(tasks) {
    var container = document.getElementById('tasks-container');
    if (!container || !tasks || !tasks.length) return;
    var isEdit = (container.getAttribute('data-edit') === '1');
    var start = container.querySelectorAll('.task-item').length;
    tasks.forEach(function (t, offset) {
      var idx = start + offset;
      var card = document.createElement('div');
      card.className = 'card mb-2 task-item';
      
      // Added: draggable
      addDragListeners(card);
      
      var html = '' +
        '<div class="card-body">' +
        '<div class="task-header d-flex align-items-center justify-content-between">' +
          '<div class="d-flex align-items-center gap-2 flex-grow-1">' +
            '<div class="form-check header-select">' +
              '<input class="form-check-input task-select" type="checkbox">' +
              '<label class="form-check-label small">Seleccionar</label>' +
            '</div>' +
            // Added: order input
            '<input type="hidden" class="task-order" name="tasks[' + idx + '][orden]" value="' + idx + '">' +
            '<input type="text" class="form-control form-control-sm task-title-input" name="tasks[' + idx + '][nombre]" placeholder="Nombre de la tarea" value="' + (t.nombre || '') + '">' +
          '</div>' +
          '<i class="fa-solid fa-chevron-down ms-2"></i>' +
        '</div>' +
        '<div class="task-content mt-2">' +
        '<div class="mb-2"><textarea class="form-control task-desc" name="tasks[' + idx + '][descripcion]" rows="3" placeholder="Descripción">' + (t.descripcion || '') + '</textarea></div>' +
        '<div class="form-check mt-2"><input class="form-check-input" type="checkbox" name="tasks[' + idx + '][completada]"' + (t.completada ? ' checked' : '') + '><label class="form-check-label">Completada</label></div>' +
        '<div class="mt-2"><textarea class="form-control" name="tasks[' + idx + '][notas]" rows="2" placeholder="Notas">' + (t.notas || '') + '</textarea></div>' +
        // Added: Tags container
        '<div class="mt-2" id="tags-container-' + idx + '"></div>' +
        buildTagDropdown(idx) +
        '<div class="mt-2"><button type="button" class="btn btn-sm btn-outline-secondary" onclick="addSubtask(this)"><i class="fa-solid fa-plus me-1"></i> Añadir subtarea</button></div>' +
        '<div class="mt-2 subtasks-container">';
      (t.subtareas || []).forEach(function (s, si) {
        html += '<div class="row g-2 align-items-center subtask-item">' +
          '<div class="col-md-6"><input type="text" class="form-control" name="tasks[' + idx + '][subtareas][' + si + '][nombre]" placeholder="Nombre de la subtarea" value="' + (s.nombre || '') + '"></div>' +
          '<div class="col-md-3 form-check"><input class="form-check-input" type="checkbox" name="tasks[' + idx + '][subtareas][' + si + '][completada]"><label class="form-check-label">Completada</label></div>' +
          '</div>';
      });
      html += '</div><div class="mt-2 text-end"><button type="button" class="btn btn-sm btn-outline-danger btn-remove-task"><i class="fa-solid fa-trash me-1"></i> Borrar tarea</button></div></div>';
      card.innerHTML = html;
      container.appendChild(card);
    });
    updateTaskOrders();
  }
  function showInlineAlert(targetSelector, type, msg) {
    var containerTop = document.querySelector('main');
    var target = document.querySelector(targetSelector);
    var alert = document.createElement('div');
    alert.className = 'alert alert-' + type + ' message-bar mt-2';
    alert.setAttribute('role', 'status');
    alert.innerHTML = '<i class="fa-solid ' + (type === 'success' ? 'fa-circle-check' : (type === 'danger' ? 'fa-triangle-exclamation' : 'fa-info-circle')) + ' me-2"></i>' + msg;
    var insertParent = (type === 'danger' && containerTop) ? containerTop : (target && target.parentNode ? target.parentNode : document.body);
    if (insertParent === containerTop) {
      insertParent.insertBefore(alert, insertParent.firstChild);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      insertParent.insertBefore(alert, target || insertParent.firstChild);
    }
    setTimeout(function () {
      alert.classList.add('fade');
      setTimeout(function () {
        if (alert && alert.parentNode) alert.parentNode.removeChild(alert);
      }, 300);
    }, 4000);
  }
  var importCreateBtn = document.getElementById('btn-import-create');
  var importCreateInput = document.getElementById('txt-import-create');
  var dropCreate = document.getElementById('drop-zone-create');
  var browseCreate = document.getElementById('btn-browse-create');
  if (importCreateBtn && importCreateInput) {
    importCreateBtn.addEventListener('click', function () {
      var file = importCreateInput.files && importCreateInput.files[0];
      if (!file) {
        showInlineAlert('#tasks-container', 'danger', 'Archivo no válido');
        return;
      }
      var reader = new FileReader();
      reader.onload = function (e) {
        try {
          var tasks = parseTxtToTasks(String(e.target.result || ''));
          renderImportedTasks(tasks);
          showInlineAlert('#tasks-container', 'success', 'Importación completada');
        } catch (err) {
          showInlineAlert('#tasks-container', 'danger', err.message || 'Formato inválido');
        }
      };
      reader.readAsText(file);
    });
  }
  function setupDropZone(zoneEl, inputEl, onReady) {
    if (!zoneEl || !inputEl) return;
    zoneEl.addEventListener('dragover', function (ev) {
      ev.preventDefault();
      zoneEl.classList.add('dragover');
    });
    zoneEl.addEventListener('dragleave', function () {
      zoneEl.classList.remove('dragover');
    });
    zoneEl.addEventListener('drop', function (ev) {
      ev.preventDefault();
      zoneEl.classList.remove('dragover');
      var files = ev.dataTransfer && ev.dataTransfer.files ? ev.dataTransfer.files : [];
      if (!files || !files.length) return;
      var file = files[0];
      var name = (file && file.name) ? file.name.toLowerCase() : '';
      var ok = name.endsWith('.txt') || (file && file.type === 'text/plain');
      if (!ok) {
        showInlineAlert('#tasks-container', 'danger', 'Formato inválido');
        return;
      }
      var dt = new DataTransfer();
      dt.items.add(file);
      inputEl.files = dt.files;
      if (typeof onReady === 'function') onReady(file);
    });
  }
  if (browseCreate && importCreateInput) {
    browseCreate.addEventListener('click', function () {
      importCreateInput.click();
    });
  }
  setupDropZone(dropCreate, importCreateInput, function (file) {
    var fnEl = document.getElementById('filename-create');
    if (fnEl) fnEl.textContent = file && file.name ? file.name : '';
  });
  var importEditBtn = document.getElementById('btn-import-edit');
  var importEditInput = document.getElementById('txt-import-edit');
  var importForm = document.getElementById('importForm');
  var dropEdit = document.getElementById('drop-zone-edit');
  var browseEdit = document.getElementById('btn-browse-edit');
  var estadoHidden = document.getElementById('input-estado');
  var estadoToggle = document.getElementById('estado-finalizado');
  var estadoLabel = document.getElementById('label-estado-finalizado');
  var saveBtn = document.getElementById('btn-save-project');
  if (estadoHidden && estadoToggle) {
    estadoToggle.checked = (String(estadoHidden.value || '') === 'finalizado');
    var initialFinalizado = (String(estadoHidden.value || '') === 'finalizado');
    function renderEstadoLabel() {
      if (!estadoLabel) return;
      var text = estadoToggle.checked ? 'Finalizado' : 'Marcar como finalizado';
      estadoLabel.innerHTML = '<i class="fa-solid fa-flag-checkered me-1"></i> ' + text;
    }
    function renderSaveButton() {
      if (!saveBtn) return;
      var isFinalToggle = estadoToggle.checked;
      saveBtn.className = (isFinalToggle ? 'btn btn-success btn-lg w-100' : 'btn btn-primary btn-lg w-100');
      saveBtn.disabled = !!initialFinalizado;
    }
    renderEstadoLabel();
    renderSaveButton();
    estadoToggle.addEventListener('change', function () {
      estadoHidden.value = estadoToggle.checked ? 'finalizado' : 'activo';
      renderEstadoLabel();
      renderSaveButton();
    });
  }
  if (importEditBtn && importEditInput && importForm) {
    importEditBtn.addEventListener('click', function (ev) {
      var file = importEditInput.files && importEditInput.files[0];
      if (!file) {
        ev.preventDefault();
        showInlineAlert('#tasks-container', 'danger', 'Archivo no válido');
        importEditInput.value = '';
        var fn = document.getElementById('filename-edit'); if (fn) fn.textContent = '';
        return;
      }
      function ajaxImport(formData, onOk) {
        fetch('index.php?route=/proyectos/importar', {
          method: 'POST',
          headers: { 'X-Requested-With': 'XMLHttpRequest' },
          body: formData
        }).then(function (res) { return res.json(); })
          .then(function (json) {
            if (json && json.ok) {
              showInlineAlert('main', 'success', json.message || 'Importación completada');
              if (typeof onOk === 'function') onOk(json);
            } else {
              showInlineAlert('main', 'danger', (json && json.error) ? json.error : 'Importación fallida');
            }
          })
          .catch(function () {
            showInlineAlert('main', 'danger', 'Error de red');
          });
      }
      var reader = new FileReader();
      reader.onload = function (e) {
        try {
          var text = String(e.target.result || '');
          var tasks = parseTxtToTasks(text);
          var existing = getExistingTaskNames();
          var dups = [];
          var seen = {};
          tasks.forEach(function (t) {
            var k = String(t.nombre || '').toLowerCase().trim();
            if (!k) return;
            if (existing.indexOf(k) !== -1 || seen[k]) dups.push(k);
            seen[k] = true;
          });
          if (dups.length > 0) {
            var duplicatesModalEl = document.getElementById('duplicatesModal');
            var duplicatesModal = duplicatesModalEl ? new bootstrap.Modal(duplicatesModalEl) : null;
            var duplicatesList = document.getElementById('duplicatesList');
            if (duplicatesModal && duplicatesList) {
              duplicatesList.innerHTML = '<div class="mb-2 small text-muted">Selecciona duplicados a importar</div>' +
                '<div class="list-group">' + dups.map(function (d, i) {
                  var id = 'dup-pre-' + i;
                  return '<label class="list-group-item d-flex align-items-center gap-2">' +
                         '<input class="form-check-input me-1" type="checkbox" id="' + id + '" data-name="' + d + '" checked>' +
                         '<span>' + d + '</span></label>';
                }).join('') + '</div>';
              duplicatesModal.show();
              updateDupToggleText();
              var btnNonDup = document.getElementById('btn-duplicates-import-nondup');
              var btnDupImport = document.getElementById('btn-duplicates-import');
              // Importar no duplicadas vía AJAX automáticamente tras mostrar el modal
              var nonDupNames = tasks.map(function (t) { return String(t.nombre || '').trim(); })
                                     .filter(function (n) {
                                       var k = n.toLowerCase();
                                       return k && dups.indexOf(k) === -1;
                                     });
              var nonDupTasks = tasks.filter(function (t) {
                var nm = String(t.nombre || '').trim().toLowerCase();
                return nm && dups.indexOf(nm) === -1;
              });
              var fdNonDup = new FormData();
              fdNonDup.append('ajax', '1');
              var pidInput = importForm.querySelector('input[name="id"]');
              if (pidInput) fdNonDup.append('id', pidInput.value || '');
              fdNonDup.append('duplicates_only', '1');
              nonDupNames.forEach(function (nm) { fdNonDup.append('only_names[]', nm); });
              fdNonDup.append('txt', file);
              ajaxImport(fdNonDup, function () {
                appendTasksToDOM(nonDupTasks);
              });
              if (btnNonDup) {
                btnNonDup.onclick = function () {
                  ajaxImport(fdNonDup, function () {
                    appendTasksToDOM(nonDupTasks);
                  });
                };
              }
              if (btnDupImport) {
                btnDupImport.onclick = function () {
                  var allow = document.getElementById('allow-duplicates-edit');
                  var fdDup = new FormData();
                  fdDup.append('ajax', '1');
                  var pidInput2 = importForm.querySelector('input[name="id"]');
                  if (pidInput2) fdDup.append('id', pidInput2.value || '');
                  fdDup.append('allow_duplicates', '1');
                  fdDup.append('duplicates_only', '1');
                  var checks = duplicatesList.querySelectorAll('input[type="checkbox"][data-name]');
                  var any = false;
                  var selectedNames = [];
                  checks.forEach(function (chk) {
                    if (chk.checked) {
                      any = true;
                      var nmSel = chk.getAttribute('data-name') || '';
                      fdDup.append('only_names[]', nmSel);
                      selectedNames.push(String(nmSel || '').toLowerCase());
                    }
                  });
                  if (!any) {
                    showInlineAlert('#tasks-container', 'info', 'No hay duplicados seleccionados');
                    return;
                  }
                  fdDup.append('txt', file);
                  ajaxImport(fdDup, function () {
                    var dupTasks = tasks.filter(function (t) {
                      var nm = String(t.nombre || '').trim().toLowerCase();
                      return nm && selectedNames.indexOf(nm) !== -1;
                    });
                    appendTasksToDOM(dupTasks);
                    var dme = document.getElementById('duplicatesModal');
                    if (dme) {
                      var modalInst = bootstrap.Modal.getInstance(dme);
                      if (modalInst) modalInst.hide();
                    }
                  });
                };
              }
            } else {
              var fdAll = new FormData();
              fdAll.append('ajax', '1');
              var pidAll = importForm.querySelector('input[name="id"]');
              if (pidAll) fdAll.append('id', pidAll.value || '');
              fdAll.append('txt', file);
              ajaxImport(fdAll, function () {
                appendTasksToDOM(tasks);
              });
            }
          } else {
            var fdAll2 = new FormData();
            fdAll2.append('ajax', '1');
            var pidAll2 = importForm.querySelector('input[name="id"]');
            if (pidAll2) fdAll2.append('id', pidAll2.value || '');
            fdAll2.append('txt', file);
            ajaxImport(fdAll2, function () {
              appendTasksToDOM(tasks);
            });
          }
        } catch (err) {
          ev.preventDefault();
          showInlineAlert('#tasks-container', 'danger', err.message || 'Formato inválido');
          importEditInput.value = '';
          var fn = document.getElementById('filename-edit'); if (fn) fn.textContent = '';
        }
      };
      ev.preventDefault();
      reader.readAsText(file);
    });
  }
  if (browseEdit && importEditInput) {
    browseEdit.addEventListener('click', function () {
      importEditInput.click();
    });
  }
  setupDropZone(dropEdit, importEditInput, function (file) {
    var fnEl = document.getElementById('filename-edit');
    if (fnEl) fnEl.textContent = file && file.name ? file.name : '';
  });
  if (importCreateInput) {
    importCreateInput.addEventListener('change', function () {
      var fnEl = document.getElementById('filename-create');
      var f = importCreateInput.files && importCreateInput.files[0];
      if (fnEl) fnEl.textContent = f && f.name ? f.name : '';
    });
  }
  if (importEditInput) {
    importEditInput.addEventListener('change', function () {
      var fnEl = document.getElementById('filename-edit');
      var f = importEditInput.files && importEditInput.files[0];
      if (fnEl) fnEl.textContent = f && f.name ? f.name : '';
    });
  }
  function getExistingTaskNames() {
    var container = document.getElementById('tasks-container');
    var inputs = container ? container.querySelectorAll('input[name*="[nombre]"]') : [];
    var names = [];
    inputs.forEach(function (inp) {
      var v = String(inp.value || '').toLowerCase().trim();
      if (v) names.push(v);
    });
    return names;
  }
  function detectDuplicatesFromFile(inputEl) {
    return new Promise(function (resolve, reject) {
      var file = inputEl.files && inputEl.files[0];
      if (!file) {
        reject(new Error('Archivo no válido'));
        return;
      }
      var reader = new FileReader();
      reader.onload = function (e) {
        try {
          var tasks = parseTxtToTasks(String(e.target.result || ''));
          var existing = getExistingTaskNames();
          var dupTasks = [];
          var seen = {};
          tasks.forEach(function (t) {
            var key = String(t.nombre || '').toLowerCase().trim();
            if (!key) return;
            if (existing.indexOf(key) !== -1 || seen[key]) {
              dupTasks.push(key);
            }
            seen[key] = true;
          });
          resolve({ tasks: tasks, duplicates: dupTasks });
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsText(file);
    });
  }
  var btnDetectEdit = document.getElementById('btn-detect-duplicates-edit');
  var btnDetectCreate = document.getElementById('btn-detect-duplicates-create');
  var duplicatesModalEl = document.getElementById('duplicatesModal');
  var duplicatesModal = duplicatesModalEl ? new bootstrap.Modal(duplicatesModalEl) : null;
  var duplicatesList = document.getElementById('duplicatesList');
  var btnDupImport = document.getElementById('btn-duplicates-import');
  var btnDupToggle = document.getElementById('btn-duplicates-toggle');
  function updateDupToggleText() {
    if (!btnDupToggle || !duplicatesList) return;
    var checks = duplicatesList.querySelectorAll('input[type="checkbox"][data-name]');
    var arr = Array.prototype.slice.call(checks);
    var allChecked = arr.length > 0 && arr.every(function (c) { return c.checked; });
    btnDupToggle.textContent = allChecked ? 'Seleccionar ninguno' : 'Seleccionar todo';
  }
  if (btnDupToggle && duplicatesList) {
    btnDupToggle.addEventListener('click', function () {
      var checks = duplicatesList.querySelectorAll('input[type="checkbox"][data-name]');
      var arr = Array.prototype.slice.call(checks);
      var allChecked = arr.length > 0 && arr.every(function (c) { return c.checked; });
      arr.forEach(function (c) { c.checked = !allChecked; });
      updateDupToggleText();
    });
  }
  if (btnDetectEdit && importEditInput && duplicatesModal && duplicatesList) {
    btnDetectEdit.addEventListener('click', function () {
      var f = importEditInput.files && importEditInput.files[0];
      if (!f) {
        showInlineAlert('#tasks-container', 'danger', 'Archivo no válido');
        importEditInput.value = '';
        var fn = document.getElementById('filename-edit'); if (fn) fn.textContent = '';
        return;
      }
      detectDuplicatesFromFile(importEditInput).then(function (res) {
        if (!res.duplicates.length) {
          showInlineAlert('#tasks-container', 'info', 'No se detectaron duplicados');
          return;
        }
        duplicatesList.innerHTML = '<div class="mb-2 small text-muted">Selecciona duplicados a importar</div>' +
          '<div class="list-group">' + res.duplicates.map(function (d, i) {
            var id = 'dup-' + i;
            return '<label class="list-group-item d-flex align-items-center gap-2">' +
                   '<input class="form-check-input me-1" type="checkbox" id="' + id + '" data-name="' + d + '" checked>' +
                   '<span>' + d + '</span></label>';
          }).join('') + '</div>';
        duplicatesModal.show();
        updateDupToggleText();
        duplicatesList.addEventListener('change', function (e) {
          if (e.target && e.target.matches('input[type="checkbox"][data-name]')) {
            updateDupToggleText();
          }
        });
        if (btnDupImport) {
          btnDupImport.onclick = function () {
            var importForm = document.getElementById('importForm');
            if (!importForm) return;
            var allow = document.getElementById('allow-duplicates-edit');
            if (allow) allow.value = '1';
            var dupOnlyInput = document.createElement('input');
            dupOnlyInput.type = 'hidden';
            dupOnlyInput.name = 'duplicates_only';
            dupOnlyInput.value = '1';
            importForm.appendChild(dupOnlyInput);
            var checks = duplicatesList.querySelectorAll('input[type="checkbox"][data-name]');
            var any = false;
            checks.forEach(function (chk) {
              if (chk.checked) {
                any = true;
                var h = document.createElement('input');
                h.type = 'hidden';
                h.name = 'only_names[]';
                h.value = chk.getAttribute('data-name') || '';
                importForm.appendChild(h);
              }
            });
            if (!any) {
              showInlineAlert('#tasks-container', 'info', 'No hay duplicados seleccionados');
              return;
            }
            importForm.submit();
          };
        }
      }).catch(function (err) {
        showInlineAlert('#tasks-container', 'danger', err.message || 'Formato inválido');
        importEditInput.value = '';
        var fn = document.getElementById('filename-edit'); if (fn) fn.textContent = '';
      });
    });
  }
  if (btnDetectCreate && importCreateInput && duplicatesModal && duplicatesList) {
    btnDetectCreate.addEventListener('click', function () {
      detectDuplicatesFromFile(importCreateInput).then(function (res) {
        if (!res.duplicates.length) {
          showInlineAlert('#tasks-container', 'info', 'No se detectaron duplicados');
          return;
        }
        duplicatesList.innerHTML = '<ul class="mb-0">' + res.duplicates.map(function (d) {
          return '<li>' + d + '</li>';
        }).join('') + '</ul>';
        duplicatesModal.show();
        if (btnDupImport) {
          btnDupImport.onclick = function () {
            showInlineAlert('#tasks-container', 'info', 'Importar duplicados solo disponible al editar');
          };
        }
      }).catch(function (err) {
        showInlineAlert('#tasks-container', 'danger', err.message || 'Formato inválido');
      });
    });
  }
  var confirmRemoveTaskBtn = document.getElementById('confirmRemoveTaskBtn');
  var confirmRemoveTaskModalEl = document.getElementById('confirmRemoveTaskModal');
  var confirmRemoveTaskModal = confirmRemoveTaskModalEl ? new bootstrap.Modal(confirmRemoveTaskModalEl) : null;
  var taskToRemove = null;
  var removeTaskNameEl = document.getElementById('removeTaskName');
  var selectAllTasks = document.getElementById('select-all-tasks');
  var bulkDeleteBtn = document.getElementById('btn-bulk-delete-tasks');
  var bulkDeleteModalEl = document.getElementById('bulkDeleteTasksModal');
  var bulkDeleteModal = bulkDeleteModalEl ? new bootstrap.Modal(bulkDeleteModalEl) : null;
  var bulkDeleteCountEl = document.getElementById('bulkDeleteCount');
  var confirmBulkDeleteBtn = document.getElementById('confirmBulkDeleteTasksBtn');
  var toggleAllCollapseBtn = document.getElementById('btn-toggle-collapse-all');
  var tasksContainerEl = document.getElementById('tasks-container');
  isEditMode = !!(tasksContainerEl && tasksContainerEl.getAttribute('data-edit') === '1');
  var projectIdInput = document.querySelector('#projectForm input[name="id"]');
  collapseKey = (isEditMode && projectIdInput && projectIdInput.value) ? ('project:' + String(projectIdInput.value) + ':collapsed') : null;
  function applyCollapsedOnLoad() {
    if (!isEditMode || !collapseKey) return;
    var set = readCollapsedSet();
    var cards = document.querySelectorAll('#tasks-container .task-item');
    cards.forEach(function (card) {
      var idx = getTaskIndexFromCard(card);
      if (idx >= 0) {
        var should = set.has(idx);
        card.classList.toggle('collapsed', !!should);
      }
    });
    if (toggleAllCollapseBtn) {
      var anyExpanded = Array.prototype.slice.call(cards).some(function (it) { return !it.classList.contains('collapsed'); });
      toggleAllCollapseBtn.innerHTML = anyExpanded
        ? '<i class="fa-solid fa-chevron-down me-1"></i> Colapsar todo'
        : '<i class="fa-solid fa-chevron-right me-1"></i> Expandir todo';
    }
  }
  var confirmRemoveSubtaskBtn = document.getElementById('confirmRemoveSubtaskBtn');
  var confirmRemoveSubtaskModalEl = document.getElementById('confirmRemoveSubtaskModal');
  var confirmRemoveSubtaskModal = confirmRemoveSubtaskModalEl ? new bootstrap.Modal(confirmRemoveSubtaskModalEl) : null;
  var subtaskToRemove = null;
  var removeSubtaskNameEl = document.getElementById('removeSubtaskName');
  var undoStack = [];
  function showUndo(type, name, onRestore) {
    var container = document.getElementById('tasks-container');
    var alert = document.createElement('div');
    alert.className = 'alert alert-warning message-bar mt-2';
    alert.setAttribute('role', 'status');
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-sm btn-outline-primary ms-2';
    btn.innerHTML = '<i class="fa-solid fa-rotate-left me-1"></i> Recuperar';
    alert.innerHTML = '<i class="fa-solid fa-info-circle me-2"></i>' + (type === 'task' ? 'Tarea' : 'Subtarea') + ' borrada: ' + name;
    alert.appendChild(btn);
    if (container && container.parentNode) container.parentNode.insertBefore(alert, container);
    btn.addEventListener('click', function () {
      try { onRestore(); } finally {
        if (alert && alert.parentNode) alert.parentNode.removeChild(alert);
      }
    });
    setTimeout(function () {
      alert.classList.add('fade');
      setTimeout(function () {
        if (alert && alert.parentNode) alert.parentNode.removeChild(alert);
      }, 300);
    }, 10000);
  }
  document.addEventListener('click', function (e) {
    if (e.target && (e.target.classList.contains('btn-remove-task') || (e.target.closest && e.target.closest('.btn-remove-task')))) {
      var btn = e.target.closest('.btn-remove-task') || e.target;
      taskToRemove = btn.closest('.task-item');
      var nameInput = taskToRemove ? taskToRemove.querySelector('input[name*="[nombre]"]') : null;
      var nm = nameInput ? String(nameInput.value || '').trim() : '';
      if (removeTaskNameEl) removeTaskNameEl.textContent = nm || '(sin nombre)';
      if (confirmRemoveTaskModal) confirmRemoveTaskModal.show();
    }
    if (e.target && (e.target.classList.contains('btn-remove-subtask') || (e.target.closest && e.target.closest('.btn-remove-subtask')))) {
      var sbtn = e.target.closest('.btn-remove-subtask') || e.target;
      subtaskToRemove = sbtn.closest('.subtask-item');
      var sinput = subtaskToRemove ? subtaskToRemove.querySelector('input[name*="[subtareas]"][name*="[nombre]"]') : null;
      var snm = sinput ? String(sinput.value || '').trim() : '';
      if (removeSubtaskNameEl) removeSubtaskNameEl.textContent = snm || '(sin nombre)';
      if (confirmRemoveSubtaskModal) confirmRemoveSubtaskModal.show();
    }
    var header = e.target.closest && e.target.closest('.task-header');
    if (header) {
      if (e.target && (e.target.closest('input') || e.target.closest('label') || e.target.closest('button') || e.target.closest('textarea') || e.target.closest('select') || e.target.closest('.drag-handle'))) return;
      var card = header.closest('.task-item');
      if (!card) return;
      card.classList.toggle('collapsed');
      if (isEditMode && collapseKey) {
        var set = readCollapsedSet();
        var idx = getTaskIndexFromCard(card);
        if (idx >= 0) {
          if (card.classList.contains('collapsed')) set.add(idx); else set.delete(idx);
          writeCollapsedSet(set);
        }
      }
    }
  });
  if (selectAllTasks) {
    selectAllTasks.addEventListener('change', function () {
      var checks = document.querySelectorAll('#tasks-container .task-select');
      checks.forEach(function (c) { c.checked = !!selectAllTasks.checked; });
    });
  }
  if (bulkDeleteBtn && bulkDeleteModal && bulkDeleteCountEl && confirmBulkDeleteBtn) {
    bulkDeleteBtn.addEventListener('click', function () {
      var selected = document.querySelectorAll('#tasks-container .task-select:checked');
      var count = selected.length;
      if (!count) {
        showInlineAlert('#tasks-container', 'info', 'No hay tareas seleccionadas');
        return;
      }
      bulkDeleteCountEl.textContent = String(count);
      bulkDeleteModal.show();
    });
    confirmBulkDeleteBtn.addEventListener('click', function () {
      var selected = Array.prototype.slice.call(document.querySelectorAll('#tasks-container .task-select:checked'));
      selected.forEach(function (chk) {
        var card = chk.closest('.task-item');
        if (card && card.parentNode) {
          var parent = card.parentNode;
          var siblings = Array.prototype.slice.call(parent.children);
          var idx = siblings.indexOf(card);
          var clone = card;
          var nameInput = clone.querySelector('input[name*="[nombre]"]');
          var nm = nameInput ? String(nameInput.value || '').trim() : '';
          parent.removeChild(card);
          showUndo('task', nm || '(sin nombre)', function () {
            var children = Array.prototype.slice.call(parent.children);
            if (idx >= 0 && idx < children.length) {
              parent.insertBefore(clone, children[idx]);
            } else {
              parent.appendChild(clone);
            }
          });
        }
      });
      bulkDeleteModal.hide();
    });
  }
  if (toggleAllCollapseBtn) {
    toggleAllCollapseBtn.addEventListener('click', function () {
      var items = Array.prototype.slice.call(document.querySelectorAll('#tasks-container .task-item'));
      if (!items.length) return;
      var anyExpanded = items.some(function (it) { return !it.classList.contains('collapsed'); });
      items.forEach(function (it) {
        it.classList.toggle('collapsed', anyExpanded);
      });
      toggleAllCollapseBtn.innerHTML = anyExpanded
        ? '<i class="fa-solid fa-chevron-right me-1"></i> Expandir todo'
        : '<i class="fa-solid fa-chevron-down me-1"></i> Colapsar todo';
      if (isEditMode && collapseKey) {
        var set = new Set();
        if (anyExpanded) {
          items.forEach(function (it) {
            var idx = getTaskIndexFromCard(it);
            if (idx >= 0) set.add(idx);
          });
        }
        writeCollapsedSet(set);
      }
    });
  }
  applyCollapsedOnLoad();
  if (confirmRemoveTaskBtn && confirmRemoveTaskModal) {
    confirmRemoveTaskBtn.addEventListener('click', function () {
      if (taskToRemove && taskToRemove.parentNode) {
        var parent = taskToRemove.parentNode;
        var siblings = Array.prototype.slice.call(parent.children);
        var idx = siblings.indexOf(taskToRemove);
        var clone = taskToRemove;
        parent.removeChild(taskToRemove);
        var nameInput = clone.querySelector('input[name*="[nombre]"]');
        var nm = nameInput ? String(nameInput.value || '').trim() : '';
        showUndo('task', nm || '(sin nombre)', function () {
          var children = Array.prototype.slice.call(parent.children);
          if (idx >= 0 && idx < children.length) {
            parent.insertBefore(clone, children[idx]);
          } else {
            parent.appendChild(clone);
          }
        });
        taskToRemove = null;
      }
      confirmRemoveTaskModal.hide();
    });
  }
  if (confirmRemoveSubtaskBtn && confirmRemoveSubtaskModal) {
    confirmRemoveSubtaskBtn.addEventListener('click', function () {
      if (subtaskToRemove && subtaskToRemove.parentNode) {
        var parent = subtaskToRemove.parentNode;
        var siblings = Array.prototype.slice.call(parent.children);
        var idx = siblings.indexOf(subtaskToRemove);
        var clone = subtaskToRemove;
        var sinput = clone.querySelector('input[name*="[subtareas]"][name*="[nombre]"]');
        var snm = sinput ? String(sinput.value || '').trim() : '';
        parent.removeChild(subtaskToRemove);
        showUndo('subtask', snm || '(sin nombre)', function () {
          var children = Array.prototype.slice.call(parent.children);
          if (idx >= 0 && idx < children.length) {
            parent.insertBefore(clone, children[idx]);
          } else {
            parent.appendChild(clone);
          }
        });
        subtaskToRemove = null;
      }
      confirmRemoveSubtaskModal.hide();
    });
  }
  var deleteModalEl = document.getElementById('confirmDeleteModal');
  var confirmBtn = document.getElementById('confirmDeleteBtn');
  var nameEl = document.getElementById('deleteProjectName');
  var blockedMsg = document.getElementById('deleteBlockedMsg');
  var currentDeleteForm = null;
  if (deleteModalEl && confirmBtn && nameEl) {
    var deleteModal = new bootstrap.Modal(deleteModalEl);
    var deleteBtns = document.querySelectorAll('.btn-delete');
    deleteBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var name = btn.getAttribute('data-name') || '';
        var estado = btn.getAttribute('data-estado') || '';
        nameEl.textContent = name;
        currentDeleteForm = btn.closest('form.js-delete-form');
        var blocked = estado !== 'finalizado';
        if (blockedMsg) {
          blockedMsg.classList.toggle('d-none', !blocked);
        }
        confirmBtn.disabled = blocked;
        deleteModal.show();
      });
    });
    confirmBtn.addEventListener('click', function () {
      if (currentDeleteForm) {
        currentDeleteForm.submit();
        currentDeleteForm = null;
      }
    });
  }

  var search = document.getElementById('search-project');
  if (search) {
    var rows = document.querySelectorAll('table tbody tr.project-row');
    search.addEventListener('input', function () {
      var q = search.value.toLowerCase().trim();
      rows.forEach(function (row) {
        var nameCell = row.querySelector('.project-name');
        var name = nameCell ? nameCell.textContent.toLowerCase() : '';
        row.style.display = name.indexOf(q) !== -1 ? '' : 'none';
      });
    });
  }

  function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    var c = (1 - Math.abs(2 * l - 1)) * s;
    var x = c * (1 - Math.abs((h / 60) % 2 - 1));
    var m = l - c / 2;
    var r = 0, g = 0, b = 0;
    if (0 <= h && h < 60) { r = c; g = x; b = 0; }
    else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
    else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
    else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
    else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    var toHex = function (v) {
      var hex = Math.round((v + m) * 255).toString(16).padStart(2, '0');
      return hex;
    };
    return '#' + toHex(r) + toHex(g) + toHex(b);
  }

  function generatePalette(style, size) {
    var baseHue = Math.floor(Math.random() * 360);
    size = Math.max(3, Math.min(6, parseInt(size || 5, 10)));
    if (style === 'contraste') {
      var step = Math.round(360 / size);
      var offs = [];
      for (var i = 0; i < size; i++) { offs.push(i * step); }
      var sat = 75 + Math.floor(Math.random() * 15);
      var l = 40 + Math.floor(Math.random() * 10);
      return offs.map(function (o) { return hslToHex((baseHue + o) % 360, sat, l); });
    } else if (style === 'pastel') {
      var offsets = [];
      for (var i = 0; i < size; i++) { offsets.push((i - Math.floor(size / 2)) * 12); }
      var satP = 15 + Math.floor(Math.random() * 11);
      var lightP = 85 + Math.floor(Math.random() * 11);
      return offsets.map(function (off) { return hslToHex((baseHue + off + 360) % 360, satP, Math.min(95, lightP)); });
    } else if (style === 'monocromatica') {
      var sats = []; var lights = [];
      var sStart = 35, sEnd = 75, lStart = 35, lEnd = 75;
      var sStep = (sEnd - sStart) / (size - 1);
      var lStep = (lEnd - lStart) / (size - 1);
      for (var i = 0; i < size; i++) { sats.push(Math.round(sStart + sStep * i)); lights.push(Math.round(lStart + lStep * i)); }
      return sats.map(function (s, i) { return hslToHex(baseHue, s, lights[i]); });
    } else if (style === 'analoga') {
      var offsA = [];
      for (var i = 0; i < size; i++) { offsA.push((i - Math.floor(size / 2)) * 12); }
      var satA2 = 50 + Math.floor(Math.random() * 16);
      var lightA2 = 46 + Math.floor(Math.random() * 9);
      return offsA.map(function (o, i) {
        var h = (baseHue + o + 360) % 360;
        var l = Math.min(88, lightA2 + i * 6);
        return hslToHex(h, satA2, l);
      });
    } else if (style === 'complementaria') {
      var offsC = [0, 180];
      var extras = [20, 200, 160, 340, 40];
      for (var i = 0; i < extras.length && offsC.length < size; i++) { offsC.push(extras[i]); }
      var satC = 75 + Math.floor(Math.random() * 15);
      var lightC = 40 + Math.floor(Math.random() * 10);
      return offsC.map(function (o) { return hslToHex((baseHue + o) % 360, satC, lightC); });
    } else if (style === 'oscuro') {
      var offsO = [];
      for (var i = 0; i < size; i++) { offsO.push((i - Math.floor(size / 2)) * 12); }
      var satO = 75 + Math.floor(Math.random() * 15);
      var lightO = 25 + Math.floor(Math.random() * 10);
      return offsO.map(function (off) { return hslToHex((baseHue + off + 360) % 360, satO, lightO); });
    } else if (style === 'neutro') {
      var offsN = [];
      for (var i = 0; i < size; i++) { offsN.push((i - Math.floor(size / 2)) * 12); }
      var satN = 5 + Math.floor(Math.random() * 15);
      var lightN = 45 + Math.floor(Math.random() * 10);
      return offsN.map(function (off) { return hslToHex((baseHue + off + 360) % 360, satN, lightN); });
    } else {
      var offsetsA = [];
      for (var i = 0; i < size; i++) { offsetsA.push((i - Math.floor(size / 2)) * 12); }
      var satA = 55 + Math.floor(Math.random() * 16);
      var lightBaseA = 44 + Math.floor(Math.random() * 9);
      return offsetsA.map(function (off, i) {
        var h = (baseHue + off + 360) % 360;
        var l = Math.min(82, lightBaseA + i * 6);
        return hslToHex(h, satA, l);
      });
    }
  }

  function renderPaletteCard(colors, container, onUse) {
    var colDiv = document.createElement('div');
    colDiv.className = 'col-12 col-sm-6';
    var card = document.createElement('div');
    card.className = 'card palette-card';
    var body = document.createElement('div');
    body.className = 'card-body';
    var strip = document.createElement('div');
    strip.className = 'palette-strip';
    function contrastColor(hex) {
      var h = hex.replace('#', '');
      var r = parseInt(h.substring(0,2), 16);
      var g = parseInt(h.substring(2,4), 16);
      var b = parseInt(h.substring(4,6), 16);
      var yiq = ((r*299)+(g*587)+(b*114))/1000;
      return yiq >= 128 ? '#000' : '#fff';
    }
    function generatePaletteCSS(cols) {
      var out = [':root {'];
      cols.forEach(function (c, i) {
        out.push('  --color-' + (i + 1) + ': ' + c + ';');
      });
      out.push('}');
      return out.join('\n');
    }
    colors.forEach(function (c) {
      var block = document.createElement('div');
      block.className = 'palette-block';
      block.style.backgroundColor = c;
      block.title = c;
      var label = document.createElement('span');
      label.className = 'hex';
      label.textContent = c.toUpperCase();
      label.style.color = contrastColor(c);
      block.appendChild(label);
      strip.appendChild(block);
    });
    var code = colors.join(',');
    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'form-control form-control-sm mb-2';
    input.readOnly = true;
    input.value = code;
    var actions = document.createElement('div');
    actions.className = 'actions';
    var useBtn = document.createElement('button');
    useBtn.type = 'button';
    useBtn.className = 'btn btn-sm btn-outline-success';
    useBtn.textContent = 'Usar esta';
    useBtn.addEventListener('click', function () { onUse(code, colors); });
    var copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'btn btn-sm btn-outline-secondary';
    copyBtn.textContent = 'Copiar';
    copyBtn.addEventListener('click', function () { navigator.clipboard.writeText(code); });
    var copyCssBtn = document.createElement('button');
    copyCssBtn.type = 'button';
    copyCssBtn.className = 'btn btn-sm btn-outline-primary';
    copyCssBtn.textContent = 'Copiar CSS';
    copyCssBtn.addEventListener('click', function () {
      navigator.clipboard.writeText(generatePaletteCSS(colors));
    });
    var saveCssBtn = document.createElement('button');
    saveCssBtn.type = 'button';
    saveCssBtn.className = 'btn btn-sm btn-outline-dark';
    saveCssBtn.textContent = 'Guardar CSS';
    saveCssBtn.addEventListener('click', function () {
      var content = generatePaletteCSS(colors);
      var blob = new Blob([content], { type: 'text/css;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'palette.css';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
    actions.appendChild(useBtn);
    actions.appendChild(copyBtn);
    actions.appendChild(copyCssBtn);
    actions.appendChild(saveCssBtn);
    body.appendChild(strip);
    body.appendChild(input);
    body.appendChild(actions);
    card.appendChild(body);
    colDiv.appendChild(card);
    container.appendChild(colDiv);
  }

  var btnOpenPalette = document.getElementById('btn-open-palette');
  var paletteGrid = document.getElementById('palette-grid');
  var paletteModalEl = document.getElementById('paletteModal');
  var paletteModal = paletteModalEl ? new bootstrap.Modal(paletteModalEl) : null;
  var btnRegenerate = document.getElementById('btn-regenerate-palettes');
  var inputPaleta = document.getElementById('input-paleta');
  var inputPaletaStyle = document.getElementById('input-paleta-style');
  var inputPaletaSize = document.getElementById('input-paleta-size');
  var preview = document.getElementById('palette-preview');
  var paletteCodeInput = document.getElementById('palette-code');
  var btnCopyPalette = document.getElementById('btn-copy-palette');
  var btnCopyPaletteCSS = document.getElementById('btn-copy-palette-css');
  var btnSavePaletteCSS = document.getElementById('btn-save-palette-css');
  function generatePaletteCSSFromColors(cols) {
    var out = [':root {'];
    cols.forEach(function (c, i) { out.push('  --color-' + (i + 1) + ': ' + c + ';'); });
    out.push('}');
    return out.join('\n');
  }

  function setPalette(code, colors) {
    if (inputPaleta) inputPaleta.value = code;
    if (paletteCodeInput) paletteCodeInput.value = code;
    var styleSel = document.getElementById('palette-style');
    var sizeSel = document.getElementById('palette-size');
    if (inputPaletaStyle && styleSel) inputPaletaStyle.value = styleSel.value || '';
    if (inputPaletaSize && sizeSel) inputPaletaSize.value = sizeSel.value || '';
    if (preview) {
      preview.innerHTML = '';
      function contrastColor(hex) {
        var h = hex.replace('#', '');
        var r = parseInt(h.substring(0,2), 16);
        var g = parseInt(h.substring(2,4), 16);
        var b = parseInt(h.substring(4,6), 16);
        var yiq = ((r*299)+(g*587)+(b*114))/1000;
        return yiq >= 128 ? '#000' : '#fff';
      }
      var strip = document.createElement('div');
      strip.className = 'palette-strip';
      colors.forEach(function (c) {
        var block = document.createElement('div');
        block.className = 'palette-block';
        block.style.backgroundColor = c;
        block.title = c;
        var label = document.createElement('span');
        label.className = 'hex';
        label.textContent = c.toUpperCase();
        label.style.color = contrastColor(c);
        block.appendChild(label);
        strip.appendChild(block);
      });
      preview.appendChild(strip);
    }
  }

  function renderPalettes() {
    if (!paletteGrid) return;
    paletteGrid.innerHTML = '';
    for (var i = 0; i < 8; i++) {
      var styleSel = document.getElementById('palette-style');
      var style = styleSel ? styleSel.value : 'armonica';
      var sizeSel = document.getElementById('palette-size');
      var size = sizeSel ? parseInt(sizeSel.value || '5', 10) : 5;
      var colors = generatePalette(style, size);
      renderPaletteCard(colors, paletteGrid, function (code, cols) {
        setPalette(code, cols);
        if (paletteModal) paletteModal.hide();
      });
    }
  }

  if (btnOpenPalette && paletteModal) {
    btnOpenPalette.addEventListener('click', function () {
      var styleSel = document.getElementById('palette-style');
      var sizeSel = document.getElementById('palette-size');
      if (styleSel && inputPaletaStyle && inputPaletaStyle.value) styleSel.value = inputPaletaStyle.value;
      if (sizeSel && inputPaletaSize && inputPaletaSize.value) sizeSel.value = inputPaletaSize.value;
      renderPalettes();
      paletteModal.show();
    });
  }
  if (btnRegenerate) {
    btnRegenerate.addEventListener('click', function () {
      renderPalettes();
    });
  }
  if (btnCopyPalette && paletteCodeInput) {
    btnCopyPalette.addEventListener('click', function () {
      navigator.clipboard.writeText(paletteCodeInput.value || '');
    });
  }
  if (btnCopyPaletteCSS && paletteCodeInput) {
    btnCopyPaletteCSS.addEventListener('click', function () {
      var cols = (paletteCodeInput.value || '').split(',').map(function (c) { return c.trim(); }).filter(Boolean);
      if (cols.length) navigator.clipboard.writeText(generatePaletteCSSFromColors(cols));
    });
  }
  if (btnSavePaletteCSS && paletteCodeInput) {
    btnSavePaletteCSS.addEventListener('click', function () {
      var cols = (paletteCodeInput.value || '').split(',').map(function (c) { return c.trim(); }).filter(Boolean);
      if (!cols.length) return;
      var content = generatePaletteCSSFromColors(cols);
      var blob = new Blob([content], { type: 'text/css;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'palette.css';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }
  if (inputPaleta && inputPaleta.value) {
    var cols = (inputPaleta.value || '').split(',').map(function (c) { return c.trim(); }).filter(Boolean);
    if (cols.length) setPalette(cols.join(','), cols);
  }

  var viewPaletteModalEl = document.getElementById('viewPaletteModal');
  var viewPaletteModal = viewPaletteModalEl ? new bootstrap.Modal(viewPaletteModalEl) : null;
  var btnsViewPalette = document.querySelectorAll('.btn-view-palette');
  var viewSwatches = document.getElementById('view-palette-swatches');
  var viewCode = document.getElementById('view-palette-code');
  var btnCopyView = document.getElementById('btn-copy-view-palette');
  var btnCopyViewCSS = document.getElementById('btn-copy-view-palette-css');
  var btnSaveViewCSS = document.getElementById('btn-save-view-palette-css');
  if (btnCopyView && viewCode) {
    btnCopyView.addEventListener('click', function () {
      navigator.clipboard.writeText(viewCode.value || '');
    });
  }
  btnsViewPalette.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var code = btn.getAttribute('data-paleta') || '';
      var colors = code.split(',').map(function (c) { return c.trim(); }).filter(Boolean);
      function contrastColor(hex) {
        var h = hex.replace('#', '');
        var r = parseInt(h.substring(0,2), 16);
        var g = parseInt(h.substring(2,4), 16);
        var b = parseInt(h.substring(4,6), 16);
        var yiq = ((r*299)+(g*587)+(b*114))/1000;
        return yiq >= 128 ? '#000' : '#fff';
      }
      function generatePaletteCSS(cols) {
        var out = [':root {'];
        cols.forEach(function (c, i) {
          out.push('  --color-' + (i + 1) + ': ' + c + ';');
        });
        out.push('}');
        return out.join('\n');
      }
      if (viewSwatches) {
        viewSwatches.innerHTML = '';
        var strip = document.createElement('div');
        strip.className = 'palette-strip';
        colors.forEach(function (c) {
          var block = document.createElement('div');
          block.className = 'palette-block';
          block.style.backgroundColor = c;
          block.title = c;
          var label = document.createElement('span');
          label.className = 'hex';
          label.textContent = c.toUpperCase();
          label.style.color = contrastColor(c);
          block.appendChild(label);
          strip.appendChild(block);
        });
        viewSwatches.appendChild(strip);
      }
      if (viewCode) viewCode.value = code;
      if (btnCopyViewCSS) {
        btnCopyViewCSS.onclick = function () {
          navigator.clipboard.writeText(generatePaletteCSS(colors));
        };
      }
      if (btnSaveViewCSS) {
        btnSaveViewCSS.onclick = function () {
          var content = generatePaletteCSS(colors);
          var blob = new Blob([content], { type: 'text/css;charset=utf-8' });
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = 'palette.css';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        };
      }
      if (viewPaletteModal) viewPaletteModal.show();
    });
  });
});
