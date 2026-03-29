require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const PAYEVO_API_URL = 'https://apiv2.payevo.com.br/functions/v1/transactions';
const PAYEVO_SECRET_KEY = process.env.PAYEVO_SECRET_KEY;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/payments/:method', async (req, res) => {
    const { method } = req.params;
    let paymentData = req.body;

    // Se for PIX, garantimos que os campos obrigatórios de e-mail e endereço estejam presentes
    if (method === 'pix') {
        // Dados padrão para preencher o que o usuário não inseriu
        const defaultCustomerData = {
            email: 'cliente@exemplo.com.br',
            phone: '11999999999',
            address: {
                street: 'Rua Padrão',
                streetNumber: '100',
                complement: 'casa',
                zipCode: '01001000',
                neighborhood: 'Centro',
                city: 'São Paulo',
                state: 'SP',
                country: 'BR'
            }
        };

        // Mescla os dados recebidos com os dados padrão
        paymentData.customer = {
            ...defaultCustomerData,
            ...paymentData.customer,
            address: {
                ...defaultCustomerData.address,
                ...(paymentData.customer && paymentData.customer.address ? paymentData.customer.address : {})
            }
        };

        // Adiciona objeto shipping padrão se não existir
        if (!paymentData.shipping) {
            paymentData.shipping = { ...defaultCustomerData.address };
        }
    }

    try {
        console.log('Enviando requisição para PayEvo:', JSON.stringify(paymentData, null, 2));
        
        const response = await axios.post(PAYEVO_API_URL, paymentData, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': 'Basic ' + Buffer.from(PAYEVO_SECRET_KEY + ':').toString('base64')
            }
        });

        console.log('Resposta da PayEvo:', JSON.stringify(response.data, null, 2));
        res.status(response.status).json(response.data);
    } catch (error) {
        console.error('Erro ao processar pagamento na PayEvo:', error.response ? error.response.data : error.message);
        
        if (error.response) {
            res.status(error.response.status).json({
                message: 'Erro na comunicação com o gateway de pagamento.',
                details: error.response.data
            });
        } else {
            res.status(500).json({ message: 'Erro interno no servidor.' });
        }
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
