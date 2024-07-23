import React from "react";
import { Modal, Button, Flex, Typography } from "antd";
import { useAccount, useConnect, useDisconnect, useSignMessage } from "wagmi";
import { apis } from "apis"
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import store, { RootState } from "store";
import { setOpenLoginModal, setOpenUsernameModal, /*setOpenOTPModal, setOTPEmail*/ } from "store/slices/appSlice";
import { Auth } from "types";
import UsernameModal from "./UsernameModal";
import { MessageContext } from "App";
import MetamaskImg from "assets/images/metamask.png";
import CoinbaseImg from "assets/images/coinbase.png";
import WalletConnectImg from "assets/images/walletconnect.png";

interface Props {
    handleLoggedIn: (auth: Auth) => void;
}

const LoginModal = ({ handleLoggedIn }: Props) => {
    // const [email, setEmail] = React.useState("");
    const { openLoginModal } = useSelector((state: RootState) => state.appKey);

    const location =  useLocation();
    const { signMessageAsync } = useSignMessage()
    const { address, isConnected } = useAccount()
    const { connectors, connect } = useConnect()
    const { disconnect } = useDisconnect();
    const [tryLogin, setTryLogin] = React.useState(false);
    const [currentUser, setCurrentUser] = React.useState<any>(null);
    const dispatch = useDispatch();
    const [loading, setLoading] = React.useState<any>({
        type: null,
        value: false
    })
    // const [mailSending, setMailSending] = React.useState(false);
    const messageAPI = React.useContext(MessageContext);

    const handleSignMessage = async ({
        publicAddress,
        username,
        nonce
    }: {
        publicAddress: string;
        username: string;
        nonce: string;
    }) => {
        try {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore because web3 is defined here.
            if (!publicAddress) {
                throw new Error(
                    'There is issue: address or chain is missing.'
                );
            } else {
                const message = `I am signing my one-time nonce: ${nonce}`;
                const signature = await signMessageAsync({ message })
                return { publicAddress, signature, username };
            }
        } catch (err) {
            throw new Error(
                'You need to sign the message to be able to log in.'
            );
        }
    };

    const handleAuthenticate = ({
        publicAddress,
        signature,
        username
    }: {
        publicAddress: string;
        signature: `0x${string}`;
        username: string;
    }) => apis.Authenticate({ publicAddress, signature, username, referral:  (new URLSearchParams(location.search)).get('referral')})
            .then((response: any) => response);       

    // const loginWithEmail = () => {
    //     if(email == "") {
    //         messageAPI.open({
    //             type: 'error',
    //             content: 'Please input email address.'
    //         });
    //         return;
    //     }
    //     setMailSending(true);
    //     apis.SendEmail({ email })
    //         .then((response: any) => {
    //             if (response.success) {
    //                 store.dispatch(setOpenOTPModal(true));
    //                 store.dispatch(setOTPEmail(email));
    //                 store.dispatch(setOpenLoginModal(false));
    //             }
    //         }).catch(err => {
    //             console.error(err);
    //         }).finally(() => {
    //             setMailSending(false);
    //         });
    // }

    const handleSignup = (publicAddress: string) =>
        apis.SignUp({ publicAddress })
            .then((response: any) => response);

    const LoginContinue = (user: any) => {
        dispatch(setOpenUsernameModal(false));
        handleSignMessage(user)
            .then(handleAuthenticate)
            .then(handleLoggedIn)
            .catch((err) => {
                messageAPI.open({
                    type: 'error',
                    content: err
                });
                disconnect();
            }).finally(() => {
                setLoading({
                    type: null,
                    value: false
                });
            })
    }

    const UsernameLogin = (username: string) => {
        const user = {
            ...currentUser,
            username: username
        }
        LoginContinue(user);
    }

    React.useEffect(() => {
        if (address && isConnected && tryLogin) {
            setTryLogin(false);
            apis.GetUserFromPublicAddress(address)
                .then(async (users: any) => {
                    const user: any = users.length ? users[0] : await handleSignup(address);
                    if (!user.username) {
                        setCurrentUser(user);
                        dispatch(setOpenUsernameModal(true));
                    } else {
                        LoginContinue(user);
                    }
                }).catch((err) => {
                    messageAPI.open({
                        type: 'error',
                        content: err
                    })
                    disconnect();
                    setLoading({
                        type: null,
                        value: false
                    })
                });
        }
    }, [address, isConnected, tryLogin]);

    React.useEffect(() => {
        if (openLoginModal) {
            setCurrentUser(null);
        }
    }, [openLoginModal]);

    return (
        <>
            <Modal
                open={openLoginModal}
                title={<Typography.Title level={4} style={{ margin: 0 }}>Login To Speak</Typography.Title>}
                footer={null}
                zIndex={50}
                width={400}
                onCancel={() => { store.dispatch(setOpenLoginModal(false)) }}
            >
                {/* <Flex vertical justify="space-around" style={{ height: 200 }}> */}
                {/* <Input
                    id="filled-search"
                    placeholder="Email"
                    style={{ height: 50 }}
                    onChange={(e) => setEmail(e.target.value)}
                    value={email}
                />
                <Button
                    type='primary'
                    onClick={loginWithEmail}
                    loading={mailSending}
                >
                    Login with Email
                </Button> */}
                <Flex justify="center" align="center" vertical style={{ marginTop: 20 }}>
                    {connectors.map((connector: any) => {
                        if (connector.type == "injected")
                            return null
                        else return (
                            <Button
                                size="large"
                                style={{ width: 200, margin: 5 }}
                                key={connector.uid}
                                onClick={() => connect({ connector }, {
                                    onSuccess: () => {
                                        setLoading({
                                            type: connector.name,
                                            value: true
                                        })
                                        setTryLogin(true);
                                    }
                                })}
                                loading={loading.type == connector.name && loading.value == true}
                            >
                                <Flex align="center">
                                    <img src={
                                        connector.name == "MetaMask" ? MetamaskImg :
                                            connector.name == "Coinbase Wallet" ? CoinbaseImg : WalletConnectImg
                                    } height={30} alt="brand" />
                                    <span>{connector.name}</span>
                                </Flex>
                            </Button>
                        )
                    })}
                </Flex>
                {/* </Flex> */}
            </Modal>
            <UsernameModal loginContinue={UsernameLogin} />
        </>
    )
}

export default LoginModal;