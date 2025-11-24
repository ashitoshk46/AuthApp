
import dns from 'dns';
import net from 'net';



export const runEmailConfCheck = () => {

    dns.lookup(process.env.SMTP_HOST, (err, address) => {
        if (err) {
            console.error('DNS resolution failed:', err);
            process.exit(1);
        } else {
            console.log('SMTP server IP:', address);
        }
    });




    const socket = net.createConnection(process.env.SMTP_PORT, 'smtp.gmail.com');
    socket.setTimeout(5000);

    socket.on('connect', () => {
        console.log(`✅ Port ${process.env.SMTP_PORT} is open`);
        socket.end();
    });

    socket.on('timeout', () => {
        console.error('❌ Connection timed out (port blocked?)');
        socket.destroy();
    });

    socket.on('error', (err) => {
        console.error('❌ Connection error:', err.message);
        process.exit(1);
    });

}

