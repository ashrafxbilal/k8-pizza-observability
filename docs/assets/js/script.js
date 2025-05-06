document.addEventListener('DOMContentLoaded', function() {
    // Terminal functionality
    const terminalInput = document.getElementById('terminal-input');
    const terminalOutput = document.getElementById('terminal-output');
    const commandButtons = document.querySelectorAll('.command-btn');
    
    // Sample pizza order data for simulation
    const pizzaOrders = [
        {
            name: 'farmhouse-veggie',
            status: 'Pending',
            created: '2023-09-15T14:30:00Z',
            pizza: {
                size: 'Large',
                toppings: ['Mushrooms', 'Tomatoes', 'Onions', 'Capsicum', 'Paneer', 'Extra Cheese']
            },
            store: {
                id: '7890',
                name: 'Dominos - Downtown',
                address: '123 Main St'
            },
            delivery: {
                address: '456 Office Tower, Tech District',
                customer: 'DevOps Team',
                phone: '555-123-4567'
            }
        },
        {
            name: 'veggie-delight',
            status: 'Delivered',
            created: '2023-09-14T12:15:00Z',
            pizza: {
                size: 'Medium',
                toppings: ['Mushrooms', 'Bell Peppers', 'Onions', 'Olives']
            },
            store: {
                id: '7890',
                name: 'Dominos - Downtown',
                address: '123 Main St'
            },
            delivery: {
                address: '456 Office Tower, Tech District',
                customer: 'DevOps Team',
                phone: '555-123-4567'
            }
        }
    ];
    
    // Command history functionality
    let commandHistory = [];
    let historyIndex = -1;
    
    // Handle terminal input
    terminalInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            const command = terminalInput.value.trim();
            if (command) {
                // Add command to history
                commandHistory.push(command);
                historyIndex = commandHistory.length;
                
                // Display command in terminal
                appendToTerminal(`<span class="prompt">$</span> ${command}`);
                
                // Process command
                processCommand(command);
                
                // Clear input
                terminalInput.value = '';
            }
        } else if (e.key === 'ArrowUp') {
            // Navigate command history (up)
            e.preventDefault();
            if (historyIndex > 0) {
                historyIndex--;
                terminalInput.value = commandHistory[historyIndex];
            }
        } else if (e.key === 'ArrowDown') {
            // Navigate command history (down)
            e.preventDefault();
            if (historyIndex < commandHistory.length - 1) {
                historyIndex++;
                terminalInput.value = commandHistory[historyIndex];
            } else {
                historyIndex = commandHistory.length;
                terminalInput.value = '';
            }
        }
    });
    
    // Command buttons
    commandButtons.forEach(button => {
        button.addEventListener('click', function() {
            const command = this.getAttribute('data-command');
            terminalInput.value = command;
            terminalInput.focus();
        });
    });
    
    // Process terminal commands
    function processCommand(command) {
        // Normalize command by trimming and converting to lowercase
        const normalizedCmd = command.toLowerCase().trim();
        
        // Handle different kubectl commands
        if (normalizedCmd === 'kubectl get pizzaorder' || normalizedCmd === 'kubectl get pizzaorders') {
            const output = `
NAME               STATUS      AGE
farmhouse-veggie  Pending     1d
veggie-delight     Delivered   2d
`;
            appendToTerminal(output);
        } 
        else if (normalizedCmd === 'kubectl apply -f samples/pizzaorder-sample.yaml') {
            const output = `
pizzaorder.pizza.k8s.io/farmhouse-veggie created
`;
            appendToTerminal(output);
        }
        else if (normalizedCmd.startsWith('kubectl describe pizzaorder')) {
            // Extract order name if provided
            const parts = normalizedCmd.split(' ');
            let orderName = 'farmhouse-veggie'; // Default
            
            if (parts.length > 3) {
                orderName = parts[3];
            }
            
            // Find the order
            const order = pizzaOrders.find(o => o.name === orderName) || pizzaOrders[0];
            
            const output = `
Name:         ${order.name}
Namespace:    default
Status:       ${order.status}
Created:      ${order.created}

Spec:
  Pizza:
    Size:      ${order.pizza.size}
    Toppings:  ${order.pizza.toppings.join(', ')}
  Store:
    ID:        ${order.store.id}
    Name:      ${order.store.name}
    Address:   ${order.store.address}
  Delivery:
    Address:   ${order.delivery.address}
    Customer:  ${order.delivery.customer}
    Phone:     ${order.delivery.phone}

Events:
  Type    Reason    Age   Message
  ----    ------    ----  -------
  Normal  Created   1d    PizzaOrder resource created
  Normal  Ordered   1d    Order placed with Dominos API
`;
            appendToTerminal(output);
        }
        else if (normalizedCmd.startsWith('kubectl delete pizzaorder')) {
            // Extract order name if provided
            const parts = normalizedCmd.split(' ');
            let orderName = 'farmhouse-veggie'; // Default
            
            if (parts.length > 3) {
                orderName = parts[3];
            }
            
            const output = `
pizzaorder.pizza.k8s.io/${orderName} deleted
`;
            appendToTerminal(output);
        }
        else if (normalizedCmd === 'clear' || normalizedCmd === 'cls') {
            // Clear the terminal
            terminalOutput.innerHTML = '';
        }
        else if (normalizedCmd === 'help') {
            const output = `
Available Commands:
  kubectl get pizzaorder                      - List all pizza orders
  kubectl apply -f samples/pizzaorder-sample.yaml - Create a new pizza order
  kubectl describe pizzaorder <name>          - Show details of a pizza order
  kubectl delete pizzaorder <name>            - Delete a pizza order
  clear                                       - Clear the terminal
  help                                        - Show this help message
`;
            appendToTerminal(output);
        }
        else {
            appendToTerminal(`Command not recognized: ${command}. Type 'help' for available commands.`);
        }
        
        // Scroll to bottom of terminal
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
    }
    
    // Append text to terminal output
    function appendToTerminal(text) {
        const p = document.createElement('p');
        p.innerHTML = text;
        terminalOutput.appendChild(p);
    }
    
    // Focus terminal input when clicking on terminal body
    document.querySelector('.terminal-body').addEventListener('click', function() {
        terminalInput.focus();
    });
    
    // Initialize with a welcome message
    processCommand('help');
    
    // Glitch effect for hero title
    const glitchElement = document.querySelector('.glitch');
    if (glitchElement) {
        setInterval(() => {
            glitchElement.style.animation = 'none';
            void glitchElement.offsetWidth; // Trigger reflow
            glitchElement.style.animation = null;
        }, 5000);
    }
});